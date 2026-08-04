import { Service } from 'fastify-decorators';

import type { E_AREA_CAPABILITY, ValueOf } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';

import type { RequestHook } from './authentication-middleware-contract.service';
import { PermissionMiddlewareContractService } from './permission-middleware-contract.service';

@Service()
export default class PermissionMiddlewareService implements PermissionMiddlewareContractService {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  handle(capability: ValueOf<typeof E_AREA_CAPABILITY>): RequestHook {
    return async (request): Promise<void> => {
      if (!request.user?.sub) {
        throw HTTPException.Unauthorized(
          'Autenticação necessária',
          'AUTHENTICATION_REQUIRED',
        );
      }

      const user = await this.userRepository.findById(request.user.sub);

      // MASTER pelo fecho de grupos (nao so pelo grupo principal) bypassa.
      if (await this.groupResolver.isMaster(user)) return;

      const capabilities = await this.groupResolver.resolveCapabilities(user);

      if (!capabilities.has(capability)) {
        throw HTTPException.Forbidden(
          'Permissão insuficiente para esta operação',
          'FORBIDDEN',
        );
      }
    };
  }
}
