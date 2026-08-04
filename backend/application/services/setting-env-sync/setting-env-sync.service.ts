import { Service } from 'fastify-decorators';

import type { StorageEnvSource } from './setting-env-sync-contract.service';
import { SettingEnvSyncContractService } from './setting-env-sync-contract.service';

@Service()
export default class SettingEnvSyncService implements SettingEnvSyncContractService {
  syncStorage(setting: StorageEnvSource): void {
    process.env.STORAGE_DRIVER = setting.STORAGE_DRIVER ?? 'local';
    process.env.STORAGE_ENDPOINT = setting.STORAGE_ENDPOINT ?? '';
    process.env.STORAGE_REGION = setting.STORAGE_REGION ?? 'us-east-1';
    process.env.STORAGE_BUCKET = setting.STORAGE_BUCKET ?? '';
    process.env.STORAGE_ACCESS_KEY = setting.STORAGE_ACCESS_KEY ?? '';
    process.env.STORAGE_SECRET_KEY = setting.STORAGE_SECRET_KEY ?? '';
  }
}
