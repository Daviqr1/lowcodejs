import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { StorageContractRepository } from '@application/repositories/storage/storage-contract.repository';
import { StorageContractService } from '@application/services/storage/storage-contract.service';
import { invalidateStorageMeta } from '@application/services/storage/storage-meta-cache';

type Response = Either<HTTPException, null>;

@Service()
export default class StorageDeleteUseCase {
  constructor(
    private readonly storageRepository: StorageContractRepository,
    private readonly service: StorageContractService,
  ) {}

  async execute({ _id }: { _id: string }): Promise<Response> {
    try {
      const storage = await this.storageRepository.findById(_id);

      if (!storage) {
        return left(
          HTTPException.NotFound('Arquivo não encontrado', 'STORAGE_NOT_FOUND'),
        );
      }

      await this.storageRepository.delete(_id);
      await this.service.delete(storage.filename);
      invalidateStorageMeta(storage.filename);

      return right(null);
    } catch (error) {
      console.error('[storage > delete][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'STORAGE_DELETE_ERROR',
        ),
      );
    }
  }
}
