import { S3Client } from '@aws-sdk/client-s3';
import { Service } from 'fastify-decorators';
import { join } from 'node:path';

import { SlugContractService } from '@application/services/slug/slug-contract.service';
import { Env } from '@start/env';

import type {
  DispositionMode,
  StorageDriver,
  StorageMeta,
} from './storage-config-contract.service';
import { StorageConfigContractService } from './storage-config-contract.service';

const META_TTL_MS = 5 * 60 * 1000;
const LOCAL_STORAGE_DIR = '_storage';

type CacheEntry = {
  meta: StorageMeta | null;
  expiresAt: number;
};

@Service()
export default class StorageConfigService implements StorageConfigContractService {
  private client: S3Client | null = null;
  private clientFingerprint = '';
  private readonly metaCache = new Map<string, CacheEntry>();

  constructor(private readonly slugService: SlugContractService) {}

  driver(): StorageDriver {
    if (process.env.STORAGE_DRIVER === 's3') return 's3';
    return 'local';
  }

  localPath(): string {
    return join(process.cwd(), LOCAL_STORAGE_DIR);
  }

  localFilePath(filename: string): string {
    return join(this.localPath(), filename);
  }

  url(key: string): string {
    return Env.APP_SERVER_URL.concat('/storage/').concat(key);
  }

  s3Client(): S3Client {
    // As credenciais vem do Setting e podem mudar em runtime — o cliente e
    // recriado quando a impressao digital das credenciais muda.
    const fingerprint = [
      process.env.STORAGE_ENDPOINT,
      process.env.STORAGE_ACCESS_KEY,
      process.env.STORAGE_SECRET_KEY,
      process.env.STORAGE_REGION,
    ].join('|');

    if (this.client && this.clientFingerprint === fingerprint) {
      return this.client;
    }

    this.client = new S3Client({
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY ?? '',
        secretAccessKey: process.env.STORAGE_SECRET_KEY ?? '',
      },
      region: process.env.STORAGE_REGION || 'us-east-1',
      endpoint: process.env.STORAGE_ENDPOINT,
      forcePathStyle: true,
    });
    this.clientFingerprint = fingerprint;

    return this.client;
  }

  contentDisposition(mode: DispositionMode, originalName: string): string {
    const ascii = this.slugService.toAscii(originalName);
    const encoded = encodeURIComponent(originalName);
    return `${mode}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
  }

  getCachedMeta(filename: string): StorageMeta | null | undefined {
    const entry = this.metaCache.get(filename);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.metaCache.delete(filename);
      return undefined;
    }

    return entry.meta;
  }

  setCachedMeta(filename: string, meta: StorageMeta | null): void {
    this.metaCache.set(filename, {
      meta,
      expiresAt: Date.now() + META_TTL_MS,
    });
  }

  invalidateMeta(filename: string): void {
    this.metaCache.delete(filename);
  }

  clearMetaCache(): void {
    this.metaCache.clear();
  }
}
