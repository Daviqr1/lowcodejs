import { GetObjectCommand } from '@aws-sdk/client-s3';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getInstanceByToken } from 'fastify-decorators';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import StorageMongooseRepository from '@application/repositories/storage/storage.repository';
import {
  buildContentDisposition,
  DispositionMode,
} from '@application/services/storage/content-disposition';
import {
  getCachedStorageMeta,
  setCachedStorageMeta,
  StorageMeta,
} from '@application/services/storage/storage-meta-cache';
import { getLocalStoragePath, getS3Client } from '@config/storage.config';

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
    let meta: StorageMeta | null = null;
    if (doc !== null) {
      meta = {
        originalName: doc.originalName,
        mimetype: doc.mimetype,
        location: doc.location,
      };
    }
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
  let stem = filename;
  if (dotIndex !== -1) stem = filename.slice(0, dotIndex);
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

export async function StorageContentDispositionHook(
  request: FastifyRequest,
  response: FastifyReply,
): Promise<void | FastifyReply> {
  if (!request.url.startsWith('/storage/')) return;
  if (request.method !== 'GET' && request.method !== 'HEAD') return;

  const [rawPath, rawQuery] = request.url.split('?');
  const filename = decodeURIComponent(rawPath.replace('/storage/', ''));
  if (!filename || filename.includes('..') || filename.includes('/')) {
    response.status(400).send({ message: 'Nome de arquivo inválido' });
    return response;
  }

  const query = new URLSearchParams(rawQuery ?? '');
  const mode = resolveDisposition(query.get('download'));

  const meta = await resolveStorageMeta(filename);
  if (meta !== null) {
    response.header(
      'content-disposition',
      buildContentDisposition(mode, meta.originalName),
    );
  }

  // Per-file location (dual-read fallback during/after migration). When the
  // doc is absent from Mongo (legacy or just-uploaded race), fall back to
  // local — the historical default driver.
  const primary = meta?.location ?? 'local';
  let secondary: 'local' | 's3' = 'local';
  if (primary === 'local') secondary = 's3';

  try {
    await DRIVER_HANDLERS[primary](filename, request, response);
  } catch (primaryErr) {
    let primaryMsg = 'erro desconhecido';
    if (primaryErr instanceof Error) primaryMsg = primaryErr.message;
    console.info(
      `[Storage] ${filename} ausente no driver primário (${primary}), tentando ${secondary}: ${primaryMsg}`,
    );
    try {
      await DRIVER_HANDLERS[secondary](filename, request, response);
    } catch {
      response.status(404).send({ message: 'Arquivo não encontrado' });
    }
  }
  return response;
}
