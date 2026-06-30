/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import { ErrorLogContractRepository } from '@application/repositories/error-log/error-log-contract.repository';

interface Input {
  id: string;
  resolved: boolean;
}

interface Result {
  id: string;
  resolved: boolean;
}

type Response = Either<HTTPException, Result>;

@Service()
export default class ErrorLogResolveUseCase {
  constructor(private readonly repository: ErrorLogContractRepository) {}

  async execute({ id, resolved }: Input): Promise<Response> {
    try {
      const exists = await this.repository.setResolved(id, resolved);

      if (!exists) {
        return left(
          HTTPException.NotFound(
            'Registro de erro não encontrado',
            'ERROR_LOG_NOT_FOUND',
          ),
        );
      }

      return right({ id, resolved });
    } catch (error) {
      console.error('[error-logs > resolve][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'RESOLVE_ERROR_LOG_ERROR',
        ),
      );
    }
  }
}
