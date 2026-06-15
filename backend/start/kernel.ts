import 'reflect-metadata';

import { GetObjectCommand } from '@aws-sdk/client-s3';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import websocket from '@fastify/websocket';
import scalar from '@scalar/fastify-api-reference';
import ajv from 'ajv-errors';
import fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { bootstrap, getInstanceByToken } from 'fastify-decorators';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import z, { ZodError } from 'zod';

import { loadControllers } from '@application/core/controllers';
import { registerDependencies } from '@application/core/di-registry';
import HTTPException from '@application/core/exception.core';
import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import StorageMongooseRepository from '@application/repositories/storage/storage-mongoose.repository';
import {
  buildContentDisposition,
  type DispositionMode,
} from '@application/services/storage/content-disposition';
import {
  getCachedStorageMeta,
  setCachedStorageMeta,
  type StorageMeta,
} from '@application/services/storage/storage-meta-cache';
import { getLocalStoragePath, getS3Client } from '@config/storage.config';
import { Env } from '@start/env';

function matchOrigin(origin: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    try {
      const url = new URL(origin);
      return url.hostname.endsWith(suffix) && url.hostname !== suffix.slice(1);
    } catch {
      return false;
    }
  }
  return origin === pattern;
}

interface ValidationErrorDetail {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: {
    limit?: number;
    missingProperty?: string;
    [key: string]: unknown;
  };
  message: string;
  emUsed?: boolean;
}

interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params: {
    errors: ValidationErrorDetail[];
  };
  message: string;
}

const kernel = fastify({
  logger: false,
  ajv: {
    customOptions: {
      allErrors: true, // Retorna todos os erros, não só o primeiro
    },
    plugins: [ajv],
  },
});

kernel.register(cors, {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);

    // Origens fixas (sempre permitidas, não configuráveis)
    const fixedOrigins = [Env.APP_CLIENT_URL, Env.APP_SERVER_URL];
    if (fixedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Origens configuráveis via env var (ALLOWED_ORIGINS)
    const matched = Env.ALLOWED_ORIGINS.some((pattern) =>
      matchOrigin(origin, pattern),
    );
    if (matched) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-Timezone',
    'X-Auth-Account-Id',
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  preflight: true,
});

kernel.register(cookie, {
  secret: Env.COOKIE_SECRET,
});

const expiresIn = 60 * 60 * 24 * 1; // 1 day

kernel.register(jwt, {
  secret: {
    private: Buffer.from(Env.JWT_PRIVATE_KEY, 'base64'),
    public: Buffer.from(Env.JWT_PUBLIC_KEY, 'base64'),
  },
  sign: { expiresIn: expiresIn, algorithm: 'RS256' },
  verify: { algorithms: ['RS256'] },
  cookie: {
    signed: false,
    cookieName: 'accessToken',
  },
});

kernel.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5mb
  },
});

const DISPOSITION_MAP: Record<string, DispositionMode> = {
  '1': 'attachment',
  true: 'attachment',
  attachment: 'attachment',
};

function resolveDisposition(download: string | null): DispositionMode {
  if (download === null) return 'inline';
  return DISPOSITION_MAP[download] ?? 'inline';
}

async function resolveStorageMeta(
  filename: string,
): Promise<StorageMeta | null> {
  const cached = getCachedStorageMeta(filename);
  if (cached !== undefined) return cached;

  try {
    const repo = getInstanceByToken<StorageContractRepository>(
      StorageMongooseRepository,
    );
    const doc = await repo.findByFilename(filename);
    const meta: StorageMeta | null =
      doc === null
        ? null
        : {
            originalName: doc.originalName,
            mimetype: doc.mimetype,
            location: doc.location,
          };
    setCachedStorageMeta(filename, meta);
    return meta;
  } catch (error) {
    console.error('[Storage] Falha ao buscar metadata:', error);
    return null;
  }
}

// Hash names gerados em process-file.ts: Math.floor(Math.random() * 1e8) → 1-8 digitos.
// Tudo o mais (logo-small.webp, logo-large.webp, etc.) e staticName e pode ser
// sobrescrito mantendo a mesma URL — precisa revalidacao no navegador.
const HASH_NAME_PATTERN = /^\d{1,8}$/;

function isStaticFilename(filename: string): boolean {
  const dotIndex = filename.lastIndexOf('.');
  const stem = dotIndex === -1 ? filename : filename.slice(0, dotIndex);
  return !HASH_NAME_PATTERN.test(stem);
}

const STATIC_CACHE_CONTROL = 'no-cache, must-revalidate';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

async function serveFromLocal(
  filename: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const fullPath = join(getLocalStoragePath(), filename);
  if (!existsSync(fullPath)) {
    throw new Error(`[Storage Local] File not found: ${filename}`);
  }
  const stats = statSync(fullPath);

  if (isStaticFilename(filename)) {
    const etag = `"${stats.mtimeMs.toString(36)}-${stats.size.toString(36)}"`;
    reply.header('etag', etag);
    reply.header('last-modified', stats.mtime.toUTCString());
    reply.header('cache-control', STATIC_CACHE_CONTROL);

    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      reply.status(304).send();
      return;
    }
  } else {
    reply.header('cache-control', IMMUTABLE_CACHE_CONTROL);
  }

  reply.header('content-length', stats.size);
  reply.send(createReadStream(fullPath));
}

async function serveFromS3(
  filename: string,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const bucket = process.env.STORAGE_BUCKET!;
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: filename }),
  );

  reply.header(
    'content-type',
    response.ContentType || 'application/octet-stream',
  );

  if (isStaticFilename(filename)) {
    reply.header('cache-control', STATIC_CACHE_CONTROL);
    if (response.ETag) reply.header('etag', response.ETag);
    if (response.LastModified) {
      reply.header('last-modified', response.LastModified.toUTCString());
    }
  } else {
    reply.header('cache-control', IMMUTABLE_CACHE_CONTROL);
  }

  if (response.ContentLength) {
    reply.header('content-length', response.ContentLength);
  }

  reply.send(response.Body);
}

const DRIVER_HANDLERS = {
  local: serveFromLocal,
  s3: serveFromS3,
} as const;

kernel.addHook('onRequest', async (request, reply) => {
  if (!request.url.startsWith('/storage/')) return;
  if (request.method !== 'GET' && request.method !== 'HEAD') return;

  const [rawPath, rawQuery] = request.url.split('?');
  const filename = decodeURIComponent(rawPath.replace('/storage/', ''));
  if (!filename || filename.includes('..') || filename.includes('/')) {
    reply.status(400).send({ message: 'Nome de arquivo inválido' });
    return reply;
  }

  const query = new URLSearchParams(rawQuery ?? '');
  const mode = resolveDisposition(query.get('download'));

  const meta = await resolveStorageMeta(filename);
  if (meta !== null) {
    reply.header(
      'content-disposition',
      buildContentDisposition(mode, meta.originalName),
    );
  }

  // Per-file location (dual-read fallback during/after migration). When the
  // doc is absent from Mongo (legacy or just-uploaded race), fall back to
  // local — the historical default driver.
  const primary = meta?.location ?? 'local';
  const secondary = primary === 'local' ? 's3' : 'local';

  try {
    await DRIVER_HANDLERS[primary](filename, request, reply);
  } catch (primaryErr) {
    console.info(
      `[Storage] ${filename} ausente no driver primário (${primary}), tentando ${secondary}: ${(primaryErr as Error).message}`,
    );
    try {
      await DRIVER_HANDLERS[secondary](filename, request, reply);
    } catch {
      reply.status(404).send({ message: 'Arquivo não encontrado' });
    }
  }
  return reply;
});

kernel.setErrorHandler((error: Record<string, unknown>, request, response) => {
  console.error(JSON.stringify(error, null, 2));
  console.error(error);

  if (error instanceof HTTPException) {
    return response.status(error.code).send({
      message: error.message,
      code: error.code,
      cause: error.cause,
      ...(error.errors && { errors: error.errors }),
    });
  }

  if (error instanceof ZodError) {
    const fieldErrors = z.flattenError(error).fieldErrors as Record<
      string,
      string[]
    >;

    const errors = Object.entries(fieldErrors).reduce(
      (acc, [key, [value]]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return response.status(400).send({
      message: 'Requisição inválida',
      code: 400,
      cause: 'INVALID_PAYLOAD_FORMAT',
      errors,
    });
  }

  if (error.code === 'FST_ERR_VALIDATION') {
    const validation = error.validation as ValidationError[];

    const errors = validation.reduce(
      (acc: Record<string, string>, err: ValidationError) => {
        const field = err.instancePath
          ? err.instancePath.slice(1)
          : err.params?.errors?.[0]?.params?.missingProperty || 'unknown';

        if (err.message && field) {
          acc[field] = err.message;
        }
        return acc;
      },
      {},
    );

    return response.status(Number(error.statusCode)).send({
      message: 'Requisição inválida',
      code: error.statusCode,
      cause: 'INVALID_PAYLOAD_FORMAT',
      ...(Object.keys(errors).length > 0 && { errors }),
    });
  }

  return response.status(500).send({
    message: 'Erro interno do servidor',
    cause: 'SERVER_ERROR',
    code: 500,
  });
});

kernel.register(swagger, {
  openapi: {
    info: {
      title: 'LowCodeJs API',
      version: '1.0.0',
      description: 'LowCodeJs API with JWT cookie-based authentication',
    },
    servers: [
      {
        url: Env.APP_SERVER_URL,
        description: 'Base URL',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
      },
    },
  },
});

kernel.register(scalar, {
  routePrefix: '/documentation',
  configuration: {
    title: 'LowCodeJs API',
    theme: 'default',
  },
});

kernel.register(websocket);

registerDependencies();

kernel.register(bootstrap, {
  controllers: [...(await loadControllers())],
});

kernel.get('/openapi.json', async function () {
  return kernel.swagger();
});

export { kernel };
