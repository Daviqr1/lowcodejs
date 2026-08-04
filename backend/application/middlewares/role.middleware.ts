import { getInstanceByToken } from 'fastify-decorators';

import type { RequestHook } from './authentication-middleware-contract.service';
import type { Role } from './role-middleware-contract.service';
import { RoleMiddlewareContractService } from './role-middleware-contract.service';
import RoleMiddlewareService from './role-middleware.service';

/** Adaptador para o decorator de rota — ver `authentication.middleware.ts`. */
export function RoleMiddleware(allowedRoles: Role[]): RequestHook {
  return getInstanceByToken<RoleMiddlewareContractService>(
    RoleMiddlewareService,
  ).handle(allowedRoles);
}
