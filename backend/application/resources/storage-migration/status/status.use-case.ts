/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { right } from '@application/core/either.core';
import {
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
  type TStorageLocation,
} from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import { StorageMigrationQueueContractService } from '@application/services/storage-migration/storage-migration-queue-contract.service';

export type StorageMigrationStatusResponse = {
  current_driver: TStorageLocation;
  previous_driver: TStorageLocation;
  total_files: number;
  by_location: Record<TStorageLocation, number>;
  by_status: Record<'idle' | 'pending' | 'in_progress' | 'failed', number>;
  migration_in_progress: boolean;
  active_job_id: string | null;
  last_run_at: Date | null;
  can_cleanup: boolean;
};

type Response = Either<HTTPException, StorageMigrationStatusResponse>;

@Service()
export default class StorageMigrationStatusUseCase {
  constructor(
    private readonly storageRepository: StorageContractRepository,
    private readonly settingRepository: SettingContractRepository,
    private readonly queueService: StorageMigrationQueueContractService,
  ) {}

  async execute(): Promise<Response> {
    const [
      countLocal,
      countS3,
      countIdle,
      countPending,
      countInProgress,
      countFailed,
      activeJob,
      setting,
    ] = await Promise.all([
      this.storageRepository.countByLocation(E_STORAGE_LOCATION.LOCAL),
      this.storageRepository.countByLocation(E_STORAGE_LOCATION.S3),
      this.storageRepository.countByMigrationStatus(
        E_STORAGE_MIGRATION_STATUS.IDLE,
      ),
      this.storageRepository.countByMigrationStatus(
        E_STORAGE_MIGRATION_STATUS.PENDING,
      ),
      this.storageRepository.countByMigrationStatus(
        E_STORAGE_MIGRATION_STATUS.IN_PROGRESS,
      ),
      this.storageRepository.countByMigrationStatus(
        E_STORAGE_MIGRATION_STATUS.FAILED,
      ),
      this.queueService.getActiveJob(),
      this.settingRepository.get(),
    ]);

    let current: TStorageLocation = E_STORAGE_LOCATION.LOCAL;
    if (setting?.STORAGE_DRIVER === E_STORAGE_LOCATION.S3) {
      current = E_STORAGE_LOCATION.S3;
    }
    let previous: TStorageLocation = E_STORAGE_LOCATION.LOCAL;
    if (current === E_STORAGE_LOCATION.LOCAL) previous = E_STORAGE_LOCATION.S3;

    const totalFiles = countLocal + countS3;
    let filesOnPrevious = countS3;
    if (previous === E_STORAGE_LOCATION.LOCAL) filesOnPrevious = countLocal;

    const migrationInProgress = activeJob !== null;
    const canCleanup =
      !migrationInProgress &&
      totalFiles > 0 &&
      filesOnPrevious === 0 &&
      countFailed === 0;

    return right({
      current_driver: current,
      previous_driver: previous,
      total_files: totalFiles,
      by_location: {
        local: countLocal,
        s3: countS3,
      },
      by_status: {
        idle: countIdle,
        pending: countPending,
        in_progress: countInProgress,
        failed: countFailed,
      },
      migration_in_progress: migrationInProgress,
      active_job_id: activeJob?.id ?? null,
      last_run_at: setting?.STORAGE_MIGRATION_LAST_RUN_AT ?? null,
      can_cleanup: canCleanup,
    });
  }
}
