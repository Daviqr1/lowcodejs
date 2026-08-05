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

import type { StorageMigrationStartInput } from '../_shared.validator';

export type StorageMigrationStartResponse = {
  job_id: string;
  queued_count: number;
};

type Response = Either<HTTPException, StorageMigrationStartResponse>;

const PAGE_SIZE = 500;

@Service()
export default class StorageMigrationStartUseCase {
  constructor(
    private readonly storageRepository: StorageContractRepository,
    private readonly settingRepository: SettingContractRepository,
    private readonly queueService: StorageMigrationQueueContractService,
  ) {}

  async execute(payload: StorageMigrationStartInput): Promise<Response> {
    try {
      const activeJob = await this.queueService.getActiveJob();
      if (activeJob !== null) {
        return left(
          HTTPException.Conflict(
            'Já existe uma migração em andamento',
            'MIGRATION_ALREADY_RUNNING',
          ),
        );
      }

      const setting = await this.settingRepository.get();
      let targetDriver: TStorageLocation = E_STORAGE_LOCATION.LOCAL;
      if (setting?.STORAGE_DRIVER === E_STORAGE_LOCATION.S3) {
        targetDriver = E_STORAGE_LOCATION.S3;
      }
      let sourceDriver: TStorageLocation = E_STORAGE_LOCATION.LOCAL;
      if (targetDriver === E_STORAGE_LOCATION.LOCAL) {
        sourceDriver = E_STORAGE_LOCATION.S3;
      }

      const fileIds: string[] = [];
      let page = 1;

      // Pull pages until exhausted. We collect ids only, so memory is bounded
      // (24 bytes per ObjectId string × tens of thousands = a few MB max).
      while (true) {
        let docs;
        if (payload.retry_failed_only) {
          docs = await this.storageRepository.findByMigrationStatus(
            E_STORAGE_MIGRATION_STATUS.FAILED,
            { page, perPage: PAGE_SIZE },
          );
        } else {
          docs = await this.storageRepository.findByLocation(sourceDriver, {
            page,
            perPage: PAGE_SIZE,
          });
        }
        if (docs.length === 0) break;
        for (const doc of docs) fileIds.push(doc._id);
        if (docs.length < PAGE_SIZE) break;
        page++;
      }

      if (fileIds.length === 0) {
        return left(
          HTTPException.BadRequest(
            'Não há arquivos para migrar',
            'NO_FILES_TO_MIGRATE',
          ),
        );
      }

      const jobId = await this.queueService.enqueueMigration({
        source_driver: sourceDriver,
        target_driver: targetDriver,
        file_ids: fileIds,
        concurrency: payload.concurrency,
      });

      return right({
        job_id: jobId,
        queued_count: fileIds.length,
      });
    } catch (error) {
      console.error('[storage-migration > start][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro ao iniciar migração',
          'STORAGE_MIGRATION_START_ERROR',
        ),
      );
    }
  }
}
