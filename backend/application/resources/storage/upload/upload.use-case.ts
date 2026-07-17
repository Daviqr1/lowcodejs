import type { MultipartFile } from '@fastify/multipart';
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IStorage as Entity } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import {
  StorageContractRepository,
  type StorageCreatePayload,
} from '@application/repositories/storage/storage-contract.repository';
import { StorageContractService } from '@application/services/storage/storage-contract.service';

type Response = Either<HTTPException, Entity[]>;

@Service()
export default class StorageUploadUseCase {
  constructor(
    private readonly storageRepository: StorageContractRepository,
    private readonly service: StorageContractService,
  ) {}

  async execute(
    payload: AsyncIterableIterator<MultipartFile>,
    staticName?: string,
  ): Promise<Response> {
    try {
      const data: StorageCreatePayload[] = [];

      for await (const part of payload) {
        const sended = await this.service.upload(part, staticName);
        data.push(sended);
      }

      const storages = await this.storageRepository.createMany(data);

      return right(storages);
    } catch (error) {
      console.error('[storage > upload][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'STORAGE_UPLOAD_ERROR',
        ),
      );
    }
  }
}
