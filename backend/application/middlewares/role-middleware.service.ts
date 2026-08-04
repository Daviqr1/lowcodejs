import { Service } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';

import type { RequestHook } from './authentication-middleware-contract.service';
import type { Role } from './role-middleware-contract.service';
import { RoleMiddlewareContractService } from './role-middleware-contract.service';

@Service()
export default class RoleMiddlewareService implements RoleMiddlewareContractService {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  handle(allowedRoles: Role[]): RequestHook {
    const allowed = new Set(allowedRoles);

    return async (request): Promise<void> => {
      if (!request.user?.sub) {
        throw HTTPException.Unauthorized(
          'Autenticação necessária',
          'AUTHENTICATION_REQUIRED',
        );
      }

      const user = await this.userRepository.findById(request.user.sub);

      // `[MASTER]` exige isMaster; qualquer conjunto com ADMINISTRATOR aceita
      // isPrivileged (MASTER ou ADMINISTRATOR).
      if (allowed.has(E_ROLE.ADMINISTRATOR)) {
        if (await this.groupResolver.isPrivileged(user)) return;
      } else if (allowed.has(E_ROLE.MASTER)) {
        if (await this.groupResolver.isMaster(user)) return;
      }

      throw HTTPException.Forbidden(
        'Permissão insuficiente para esta operação',
        'FORBIDDEN',
      );
    };
  }
}
