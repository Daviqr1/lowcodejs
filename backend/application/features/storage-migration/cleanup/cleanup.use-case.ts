import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_STORAGE_LOCATION,
  E_STORAGE_MIGRATION_STATUS,
  type TStorageLocation,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { SettingContractRepository } from '@application/repositories/setting/setting-contract.repository';
import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import { StorageMigrationQueueContractService } from '@application/services/storage-migration/storage-migration-queue-contract.service';

import type { StorageMigrationCleanupInput } from '../_shared.validator';

export type StorageMigrationCleanupResponse = {
  job_id: string;
  queued_count: number;
};

type Response = Either<HTTPException, StorageMigrationCleanupResponse>;

const PAGE_SIZE = 500;

@Service()
export default class StorageMigrationCleanupUseCase {
  constructor(
    private readonly storageRepository: StorageContractRepository,
    private readonly settingRepository: SettingContractRepository,
    private readonly queueService: StorageMigrationQueueContractService,
  ) {}

  async execute(payload: StorageMigrationCleanupInput): Promise<Response> {
    if (!payload.confirm) {
      return left(
        HTTPException.BadRequest(
          'Confirmação obrigatória para limpeza',
          'CONFIRM_REQUIRED',
        ),
      );
    }

    try {
      const activeJob = await this.queueService.getActiveJob();
      if (activeJob !== null) {
        return left(
          HTTPException.Conflict(
            'Já existe uma operação em andamento',
            'MIGRATION_ALREADY_RUNNING',
          ),
        );
      }

      const setting = await this.settingRepository.get();
      let currentDriver: TStorageLocation = E_STORAGE_LOCATION.LOCAL;
      if (setting?.STORAGE_DRIVER === E_STORAGE_LOCATION.S3) {
        currentDriver = E_STORAGE_LOCATION.S3;
      }
      let driverToClear: TStorageLocation = E_STORAGE_LOCATION.LOCAL;
      if (currentDriver === E_STORAGE_LOCATION.LOCAL) {
        driverToClear = E_STORAGE_LOCATION.S3;
      }

      const failedCount = await this.storageRepository.countByMigrationStatus(
        E_STORAGE_MIGRATION_STATUS.FAILED,
      );
      const remaining =
        await this.storageRepository.countByLocation(driverToClear);

      if (remaining > 0 || failedCount > 0) {
        return left(
          HTTPException.Conflict(
            'Migração não está pronta para limpeza',
            'CLEANUP_NOT_READY',
          ),
        );
      }

      // Cleanup deletes physical files from the OLD driver. The Storage docs
      // already point to the new driver (location=current), so we collect ids
      // of all docs that were migrated and ask the worker to delete from
      // `driver_to_clear`. Since we don't track per-doc origin, the worker
      // attempts delete on every doc on the current driver.
      const fileIds: string[] = [];
      let page = 1;
      while (true) {
        const docs = await this.storageRepository.findByLocation(
          currentDriver,
          { page, perPage: PAGE_SIZE },
        );
        if (docs.length === 0) break;
        for (const doc of docs) fileIds.push(doc._id);
        if (docs.length < PAGE_SIZE) break;
        page++;
      }

      if (fileIds.length === 0) {
        return left(
          HTTPException.BadRequest(
            'Não há arquivos para limpar',
            'NO_FILES_TO_CLEANUP',
          ),
        );
      }

      const jobId = await this.queueService.enqueueCleanup({
        driver_to_clear: driverToClear,
        file_ids: fileIds,
      });

      return right({
        job_id: jobId,
        queued_count: fileIds.length,
      });
    } catch (error) {
      console.error('[storage-migration > cleanup][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao iniciar limpeza',
          'STORAGE_MIGRATION_CLEANUP_ERROR',
        ),
      );
    }
  }
}
