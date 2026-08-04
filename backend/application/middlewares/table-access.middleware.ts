import { getInstanceByToken } from 'fastify-decorators';

import type { RequestHook } from './authentication-middleware-contract.service';
import type { TableAccessOptions } from './table-access-middleware-contract.service';
import { TableAccessMiddlewareContractService } from './table-access-middleware-contract.service';
import TableAccessMiddlewareService from './table-access-middleware.service';

/** Adaptador para o decorator de rota — ver `authentication.middleware.ts`. */
export function TableAccessMiddleware(
  options: TableAccessOptions,
): RequestHook {
  return getInstanceByToken<TableAccessMiddlewareContractService>(
    TableAccessMiddlewareService,
  ).handle(options);
}
