import type { ISetting } from '@application/core/entity.core';

// So os campos STORAGE_* — aceita o doc lean do Mongo sem asserção.
type StorageEnvSource = Pick<
  ISetting,
  | 'STORAGE_DRIVER'
  | 'STORAGE_ENDPOINT'
  | 'STORAGE_REGION'
  | 'STORAGE_BUCKET'
  | 'STORAGE_ACCESS_KEY'
  | 'STORAGE_SECRET_KEY'
>;

export function syncStorageEnv(setting: StorageEnvSource): void {
  process.env.STORAGE_DRIVER = setting.STORAGE_DRIVER ?? 'local';
  process.env.STORAGE_ENDPOINT = setting.STORAGE_ENDPOINT ?? '';
  process.env.STORAGE_REGION = setting.STORAGE_REGION ?? 'us-east-1';
  process.env.STORAGE_BUCKET = setting.STORAGE_BUCKET ?? '';
  process.env.STORAGE_ACCESS_KEY = setting.STORAGE_ACCESS_KEY ?? '';
  process.env.STORAGE_SECRET_KEY = setting.STORAGE_SECRET_KEY ?? '';
}
