/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  ILogger as Entity,
  IMeta,
  Paginated,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { LoggerContractRepository } from '@application/repositories/logger/logger-contract.repository';

import type { LoggerPaginatedPayload } from './paginated.validator';

type Response = Either<HTTPException, Paginated<Entity>>;
type Payload = LoggerPaginatedPayload;

@Service()
export default class LoggerPaginatedUseCase {
  constructor(private readonly loggerRepository: LoggerContractRepository) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // const sort: Record<string, 'asc' | 'desc'> = {};

      const logs = await this.loggerRepository.findMany({ ...payload });

      const total = await this.loggerRepository.count(payload);

      const lastPage = Math.ceil(total / payload.perPage);

      const meta: IMeta = {
        total,
        perPage: payload.perPage,
        page: payload.page,
        lastPage,
        firstPage: Number(total > 0),
      };

      return right({
        meta,
        data: logs,
      });
    } catch (error) {
      console.error('[logs > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_LOG_PAGINATED_ERROR',
        ),
      );
    }
  }
}
