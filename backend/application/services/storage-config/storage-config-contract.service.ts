import type { S3Client } from '@aws-sdk/client-s3';

import type { TStorageLocation } from '@application/core/entity.core';

export type StorageDriver = 'local' | 's3';

export type StorageMeta = {
  originalName: string;
  mimetype: string;
  location: TStorageLocation;
};

export type DispositionMode = 'inline' | 'attachment';

/**
 * Resolucao de driver, caminho, cliente S3 e metadado de storage.
 *
 * Junta o que estava em `config/storage.config.ts` (4 funcoes soltas + dois
 * `let` de cache no escopo do modulo), `storage/storage-meta-cache.ts` (um
 * `Map` de modulo) e `storage/content-disposition.ts`.
 */
export abstract class StorageConfigContractService {
  /** Driver configurado. Le de `process.env`, sincronizado do Setting no boot. */
  abstract driver(): StorageDriver;

  /** Raiz do storage local (`<cwd>/_storage`). */
  abstract localPath(): string;

  /** Caminho absoluto de um arquivo no storage local. */
  abstract localFilePath(filename: string): string;

  /** URL publica de um objeto. */
  abstract url(key: string): string;

  /** Cliente S3, memoizado enquanto as credenciais nao mudarem. */
  abstract s3Client(): S3Client;

  /** Header `Content-Disposition` com fallback ASCII e a versao UTF-8. */
  abstract contentDisposition(
    mode: DispositionMode,
    originalName: string,
  ): string;

  /** `undefined` = nao esta em cache; `null` = em cache como inexistente. */
  abstract getCachedMeta(filename: string): StorageMeta | null | undefined;
  abstract setCachedMeta(filename: string, meta: StorageMeta | null): void;
  abstract invalidateMeta(filename: string): void;
  abstract clearMetaCache(): void;
}
