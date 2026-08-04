import type { E_AREA_CAPABILITY, ValueOf } from '@application/core/entity.core';

import type { RequestHook } from './authentication-middleware-contract.service';

/**
 * Guarda por capacidade de area. Substitui o RoleMiddleware nas areas do
 * sistema: em vez de papel fixo, exige uma capacidade atribuivel a qualquer
 * grupo, resolvida pelo fecho de grupos do usuario. MASTER bypassa;
 * ADMINISTRATOR nao — so tem o que o grupo dele possui.
 */
export abstract class PermissionMiddlewareContractService {
  abstract handle(capability: ValueOf<typeof E_AREA_CAPABILITY>): RequestHook;
}
