import type {
  E_TABLE_PERMISSION,
  ValueOf,
} from '@application/core/entity.core';

import type { RequestHook } from './authentication-middleware-contract.service';

export type TableAccessOptions = {
  requiredPermission: ValueOf<typeof E_TABLE_PERMISSION>;
};

/**
 * Acesso a tabela: faz o parsing da request e delega a decisao ao
 * `PermissionContractService`. Popula `request.table` e `request.ownership`.
 */
export abstract class TableAccessMiddlewareContractService {
  abstract handle(options: TableAccessOptions): RequestHook;
}
