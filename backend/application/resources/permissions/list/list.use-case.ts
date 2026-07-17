import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IPermission as Entity } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { PermissionContractRepository } from '@application/repositories/permission/permission-contract.repository';

type Response = Either<HTTPException, Entity[]>;

@Service()
export default class PermissionListUseCase {
  constructor(
    private readonly permissionRepository: PermissionContractRepository,
  ) {}

  async execute(): Promise<Response> {
    try {
      const permissions = await this.permissionRepository.findMany();
      return right(permissions);
    } catch (error) {
      console.error('[permissions > list][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_PERMISSION_ERROR',
        ),
      );
    }
  }
}
