import type { E_ROLE, ValueOf } from '@application/core/entity.core';

import type { RequestHook } from './authentication-middleware-contract.service';

export type Role = ValueOf<typeof E_ROLE>;

/**
 * Guarda por papel de sistema, resolvido pelo **fecho de grupos** (principal +
 * adicionais + englobados), nao pelo `role` do JWT — que reflete so o grupo
 * principal. Assim um MASTER/ADMINISTRATOR por grupo adicional e reconhecido.
 */
export abstract class RoleMiddlewareContractService {
  abstract handle(allowedRoles: Role[]): RequestHook;
}
