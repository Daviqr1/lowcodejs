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
    maxBytes?: number,
  ): Promise<Response> {
    const uploaded: string[] = [];
    try {
      const data: StorageCreatePayload[] = [];

      for await (const part of payload) {
        const sended = await this.service.upload(part, staticName);
        uploaded.push(sended.filename);

        // O parser trunca o stream quando passa do limite por requisição
        // (limits.fileSize). Aborta e limpa os arquivos já enviados.
        if (part.file.truncated) {
          await this.cleanup(uploaded);
          return left(this.tooLargeError(maxBytes));
        }

        data.push(sended);
      }

      const storages = await this.storageRepository.createMany(data);

      return right(storages);
    } catch (error) {
      await this.cleanup(uploaded);

      // Alguns cenários fazem o parser lançar em vez de truncar.
      if (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'FST_REQ_FILE_TOO_LARGE'
      ) {
        return left(this.tooLargeError(maxBytes));
      }

      console.error('[storage > upload][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'STORAGE_UPLOAD_ERROR',
        ),
      );
    }
  }

  private tooLargeError(maxBytes?: number): HTTPException {
    let limite = 'permitido';
    if (maxBytes && maxBytes > 0) {
      limite = `de ${Math.round(maxBytes / (1024 * 1024))}MB`;
    }
    return HTTPException.PayloadTooLarge(
      `O arquivo excede o tamanho máximo ${limite}.`,
      'FILE_TOO_LARGE',
    );
  }

  private async cleanup(filenames: string[]): Promise<void> {
    for (const filename of filenames) {
      try {
        await this.service.delete(filename);
      } catch {
        // best-effort: não deixa a limpeza mascarar o erro original
      }
    }
  }
}
