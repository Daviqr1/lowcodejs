import { type FastifyRequest } from 'fastify';
import { getInstanceByToken } from 'fastify-decorators';

import { type ValueOf, E_ROLE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import UserMongooseRepository from '@application/repositories/user/user.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';

type Role = ValueOf<typeof E_ROLE>;

/**
 * Guarda por papel de sistema (MASTER/ADMINISTRATOR), resolvido pelo **fecho de
 * grupos** (grupo principal + adicionais + englobados), nao pelo `role` do JWT
 * (que reflete apenas o grupo principal). Assim um MASTER/ADMINISTRATOR por grupo
 * adicional tambem e reconhecido.
 *
 * `[MASTER]` exige `isMaster`; qualquer conjunto que inclua ADMINISTRATOR exige
 * `isPrivileged` (MASTER ou ADMINISTRATOR).
 */
export function RoleMiddleware(allowedRoles: Role[]) {
  const allowed = new Set(allowedRoles);

  return async function (request: FastifyRequest): Promise<void> {
    if (!request.user?.sub) {
      throw HTTPException.Unauthorized(
        'Autenticação necessária',
        'AUTHENTICATION_REQUIRED',
      );
    }

    const userRepository = getInstanceByToken<UserContractRepository>(
      UserMongooseRepository,
    );
    const groupResolver =
      getInstanceByToken<GroupResolverContractService>(GroupResolverService);

    const user = await userRepository.findById(request.user.sub);

    if (allowed.has(E_ROLE.ADMINISTRATOR)) {
      if (await groupResolver.isPrivileged(user)) return;
    } else if (allowed.has(E_ROLE.MASTER)) {
      if (await groupResolver.isMaster(user)) return;
    }

    throw HTTPException.Forbidden(
      'Permissão insuficiente para esta operação',
      'FORBIDDEN',
    );
  };
}
