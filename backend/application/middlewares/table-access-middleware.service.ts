import { Service } from 'fastify-decorators';
import z from 'zod';

import {
  E_TABLE_PERMISSION,
  type ITable,
  type IUser,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { PermissionContractService } from '@application/services/permission/permission-contract.service';

import type { RequestHook } from './authentication-middleware-contract.service';
import type { TableAccessOptions } from './table-access-middleware-contract.service';
import { TableAccessMiddlewareContractService } from './table-access-middleware-contract.service';

const ParamsSchema = z.object({
  slug: z.string().trim().min(1).optional(),
});

@Service()
export default class TableAccessMiddlewareService implements TableAccessMiddlewareContractService {
  constructor(
    private readonly permissionService: PermissionContractService,
    private readonly tableRepository: TableContractRepository,
    private readonly userRepository: UserContractRepository,
  ) {}

  handle(options: TableAccessOptions): RequestHook {
    const { requiredPermission } = options;

    return async (request): Promise<void> => {
      const params = ParamsSchema.safeParse(request.params);
      if (!params.success) {
        throw HTTPException.BadRequest(
          'Parâmetros inválidos',
          'INVALID_PARAMETERS',
        );
      }

      const { slug } = params.data;

      // CREATE_TABLE nao tem tabela para buscar.
      let table: ITable | undefined = request.table;

      if (
        slug &&
        requiredPermission !== E_TABLE_PERMISSION.CREATE_TABLE &&
        !table
      ) {
        const found = await this.tableRepository.findBySlug(slug, {
          // A guarda decide autorizacao, nao existencia: restaurar e excluir uma
          // tabela na lixeira passam por aqui. Quem responde 404 e o use-case.
          includeTrashed: true,
        });

        if (!found) {
          throw HTTPException.NotFound(
            'Tabela não encontrada',
            'TABLE_NOT_FOUND',
          );
        }

        table = found;
        request.table = table;
      }

      let user: IUser | null = null;
      if (request.user?.sub) {
        user = await this.userRepository.findById(request.user.sub);
      }

      const accessInput = {
        table,
        userId: request.user?.sub,
        userRole: request.user?.role,
        user,
        requiredPermission,
        httpMethod: request.method,
      };

      // Visitante sem autenticacao em tabela publica.
      if (this.permissionService.isPublicAccess(accessInput)) return;

      const result = await this.permissionService.checkTableAccess(accessInput);

      if (result.ownership) request.ownership = result.ownership;
    };
  }
}
