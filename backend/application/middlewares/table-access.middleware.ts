import type { FastifyRequest } from 'fastify';
import { getInstanceByToken } from 'fastify-decorators';
import z from 'zod';

import {
  E_TABLE_PERMISSION,
  type ITable,
  type IUser,
  type ValueOf,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import TableMongooseRepository from '@application/repositories/table/table.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import UserMongooseRepository from '@application/repositories/user/user.repository';
import type { PermissionContractService } from '@application/services/permission/permission-contract.service';
import PermissionService from '@application/services/permission/permission.service';

const ParamsSchema = z.object({
  slug: z.string().trim().min(1).optional(),
});

type AccessOptions = {
  requiredPermission: ValueOf<typeof E_TABLE_PERMISSION>;
}

/**
 * Middleware de acesso a tabelas.
 * Parsing de request + delegacao para PermissionContractService.
 */
export function TableAccessMiddleware(options: AccessOptions) {
  const { requiredPermission } = options;

  return async function (request: FastifyRequest): Promise<void> {
    const permissionService =
      getInstanceByToken<PermissionContractService>(PermissionService);

    const tableRepository = getInstanceByToken<TableContractRepository>(
      TableMongooseRepository,
    );

    // 1. Validar parametro slug
    const params = ParamsSchema.safeParse(request.params);
    if (!params.success) {
      throw HTTPException.BadRequest(
        'Parâmetros inválidos',
        'INVALID_PARAMETERS',
      );
    }

    const { slug } = params.data;

    // 2. Buscar tabela (exceto para CREATE_TABLE)
    let table: ITable | undefined = request.table;

    if (slug && requiredPermission !== E_TABLE_PERMISSION.CREATE_TABLE) {
      if (!table) {
        const found = await tableRepository.findBySlug(slug);

        if (!found) {
          throw HTTPException.NotFound(
            'Tabela não encontrada',
            'TABLE_NOT_FOUND',
          );
        }

        table = found;
        request.table = table;
      }
    }

    // 3. Buscar usuario autenticado para verificacao de permissoes
    let user: IUser | null = null;

    if (request.user?.sub) {
      const userRepository = getInstanceByToken<UserContractRepository>(
        UserMongooseRepository,
      );
      user = await userRepository.findById(request.user.sub);
    }

    // 4. Verificar acesso publico (visitante sem auth)
    const accessInput = {
      table,
      userId: request.user?.sub,
      userRole: request.user?.role,
      user,
      requiredPermission,
      httpMethod: request.method,
    };

    if (permissionService.isPublicAccess(accessInput)) {
      return;
    }

    // 5. Verificar permissoes completas
    const result = await permissionService.checkTableAccess(accessInput);

    if (result.ownership) {
      request.ownership = result.ownership;
    }
  };
}
