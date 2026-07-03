import 'reflect-metadata';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import websocket from '@fastify/websocket';
import scalar from '@scalar/fastify-api-reference';
import ajv from 'ajv-errors';
import fastify from 'fastify';
import { bootstrap } from 'fastify-decorators';
import type { Server } from 'node:http';

import { loadControllers } from '@application/core/controllers';
import { registerDependencies } from '@application/core/di-registry';
import { ACCESS_TOKEN_COOKIE } from '@application/utils/cookies.util';
import { StorageContentDispositionHook } from '@hooks/content-disposition.hook';
import { LoadExtensionHook } from '@hooks/load-extensions.hook';
import { LoggerUserActionHook } from '@hooks/logger.hook';
import { Env } from '@start/env';
import { GlobalErrorHandler } from '@start/error-handler';

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

function registerAjvErrors(
  instance: Parameters<typeof ajv>[0],
): ReturnType<typeof ajv> {
  return ajv(instance);
}

const kernel = fastify<Server>({
  logger: false,
  ajv: {
    customOptions: {
      allErrors: true, // Retorna todos os erros, não só o primeiro
    },
    plugins: [registerAjvErrors],
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
    'X-Skip-Log',
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
    cookieName: ACCESS_TOKEN_COOKIE,
  },
});

kernel.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5mb
  },
});

kernel.addHook('onResponse', LoggerUserActionHook);
kernel.addHook('onRequest', StorageContentDispositionHook);

kernel.setErrorHandler(GlobalErrorHandler);

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

await registerDependencies();

kernel.register(bootstrap, {
  controllers: [...(await loadControllers())],
});

// Carrega o registry de extensões assim que o kernel está pronto. Roda tanto
// no boot do servidor (bin/server.ts) quanto nos testes E2E (que dão
// kernel.ready() na suíte). Falha de scan é não-fatal — apenas loga.
kernel.addHook('onReady', LoadExtensionHook);

kernel.get('/openapi.json', async function () {
  return kernel.swagger();
});

export { kernel };
