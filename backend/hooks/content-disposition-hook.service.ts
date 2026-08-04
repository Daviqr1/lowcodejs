import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'fastify-decorators';
import { createReadStream, existsSync, statSync } from 'node:fs';

import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import type {
  DispositionMode,
  StorageDriver,
  StorageMeta,
} from '@application/services/storage-config/storage-config-contract.service';
import { StorageConfigContractService } from '@application/services/storage-config/storage-config-contract.service';

import { ContentDispositionHookContractService } from './content-disposition-hook-contract.service';

const DISPOSITION_MAP: Record<string, DispositionMode> = {
  '1': 'attachment',
  true: 'attachment',
  attachment: 'attachment',
};

// Hash names gerados em process-file.ts: Math.floor(Math.random() * 1e8) → 1-8
// digitos. Tudo o mais (logo-small.webp, etc.) e staticName e pode ser
// sobrescrito mantendo a mesma URL — precisa revalidacao no navegador.
const HASH_NAME_PATTERN = /^\d{1,8}$/;

const STATIC_CACHE_CONTROL = 'no-cache, must-revalidate';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

@Service()
export default class ContentDispositionHookService implements ContentDispositionHookContractService {
  private resolveDisposition(download: string | null): DispositionMode {
    if (download === null) return 'inline';
    return DISPOSITION_MAP[download] ?? 'inline';
  }

  private isStaticFilename(filename: string): boolean {
    const dotIndex = filename.lastIndexOf('.');
    let stem = filename;
    if (dotIndex !== -1) stem = filename.slice(0, dotIndex);
    return !HASH_NAME_PATTERN.test(stem);
  }
  constructor(
    private readonly repository: StorageContractRepository,
    private readonly config: StorageConfigContractService,
  ) {}

  async handle(
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
    const mode = this.resolveDisposition(query.get('download'));

    const meta = await this.resolveMeta(filename);
    if (meta !== null) {
      response.header(
        'content-disposition',
        this.config.contentDisposition(mode, meta.originalName),
      );
    }

    // Per-file location (dual-read fallback during/after migration). When the
    // doc is absent from Mongo (legacy or just-uploaded race), fall back to
    // local — the historical default driver.
    const primary = meta?.location ?? 'local';
    let secondary: 'local' | 's3' = 'local';
    if (primary === 'local') secondary = 's3';

    try {
      await this.serve(primary, filename, request, response);
    } catch (primaryErr) {
      let primaryMsg = 'erro desconhecido';
      if (primaryErr instanceof Error) primaryMsg = primaryErr.message;
      console.info(
        `[Storage] ${filename} ausente no driver primário (${primary}), tentando ${secondary}: ${primaryMsg}`,
      );
      try {
        await this.serve(secondary, filename, request, response);
      } catch {
        response.status(404).send({ message: 'Arquivo não encontrado' });
      }
    }
    return response;
  }

  private async resolveMeta(filename: string): Promise<StorageMeta | null> {
    const cached = this.config.getCachedMeta(filename);
    if (cached !== undefined) return cached;

    try {
      const doc = await this.repository.findByFilename(filename);

      let meta: StorageMeta | null = null;
      if (doc !== null) {
        meta = {
          originalName: doc.originalName,
          mimetype: doc.mimetype,
          location: doc.location,
        };
      }

      this.config.setCachedMeta(filename, meta);
      return meta;
    } catch (error) {
      console.error('[Storage] Falha ao buscar metadata:', error);
      return null;
    }
  }

  private async serve(
    driver: StorageDriver,
    filename: string,
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    if (driver === 's3') return this.serveFromS3(filename, response);
    return this.serveFromLocal(filename, request, response);
  }

  private async serveFromLocal(
    filename: string,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const fullPath = this.config.localFilePath(filename);
    if (!existsSync(fullPath)) {
      throw new Error(`[Storage Local] File not found: ${filename}`);
    }

    const stats = statSync(fullPath);

    if (this.isStaticFilename(filename)) {
      const etag = `"${stats.mtimeMs.toString(36)}-${stats.size.toString(36)}"`;
      reply.header('etag', etag);
      reply.header('last-modified', stats.mtime.toUTCString());
      reply.header('cache-control', STATIC_CACHE_CONTROL);

      if (request.headers['if-none-match'] === etag) {
        reply.status(304).send();
        return;
      }
    } else {
      reply.header('cache-control', IMMUTABLE_CACHE_CONTROL);
    }

    reply.header('content-length', stats.size);
    reply.send(createReadStream(fullPath));
  }

  private async serveFromS3(
    filename: string,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.config.s3Client().send(
      new GetObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: filename,
      }),
    );

    reply.header(
      'content-type',
      result.ContentType || 'application/octet-stream',
    );

    if (this.isStaticFilename(filename)) {
      reply.header('cache-control', STATIC_CACHE_CONTROL);
      if (result.ETag) reply.header('etag', result.ETag);
      if (result.LastModified) {
        reply.header('last-modified', result.LastModified.toUTCString());
      }
    } else {
      reply.header('cache-control', IMMUTABLE_CACHE_CONTROL);
    }

    if (result.ContentLength) {
      reply.header('content-length', result.ContentLength);
    }

    reply.send(result.Body);
  }
}
