import { getInstanceByToken } from 'fastify-decorators';

import type { E_AREA_CAPABILITY, ValueOf } from '@application/core/entity.core';

import type { RequestHook } from './authentication-middleware-contract.service';
import { PermissionMiddlewareContractService } from './permission-middleware-contract.service';
import PermissionMiddlewareService from './permission-middleware.service';

/** Adaptador para o decorator de rota — ver `authentication.middleware.ts`. */
export function PermissionMiddleware(
  capability: ValueOf<typeof E_AREA_CAPABILITY>,
): RequestHook {
  return getInstanceByToken<PermissionMiddlewareContractService>(
    PermissionMiddlewareService,
  ).handle(capability);
}
