import type { ISetting } from '@application/core/entity.core';

// So os campos STORAGE_* — aceita o doc lean do Mongo sem asserção.
export type StorageEnvSource = Pick<
  ISetting,
  | 'STORAGE_DRIVER'
  | 'STORAGE_ENDPOINT'
  | 'STORAGE_REGION'
  | 'STORAGE_BUCKET'
  | 'STORAGE_ACCESS_KEY'
  | 'STORAGE_SECRET_KEY'
>;

/**
 * Copia a configuracao de storage do documento Setting para `process.env`.
 * O driver e o cliente S3 leem de `process.env` porque tambem precisam
 * funcionar em script standalone, fora do container.
 */
export abstract class SettingEnvSyncContractService {
  abstract syncStorage(setting: StorageEnvSource): void;
}
