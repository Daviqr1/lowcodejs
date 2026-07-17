import type { FastifyRequest } from 'fastify';
import { getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY, type ValueOf } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import UserMongooseRepository from '@application/repositories/user/user.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';

/**
 * Middleware de capacidade de area. Substitui o RoleMiddleware nas areas do
 * sistema (Usuarios, Menu, Grupos, Configuracoes, Ferramentas, Plugins): em vez
 * de um role fixo, exige uma permissao (capacidade) atribuivel a qualquer grupo.
 * MASTER continua com acesso total. As capacidades sao resolvidas pelo fecho de
 * grupos do usuario (grupo principal + adicionais + englobados).
 */
export function PermissionMiddleware(
  capability: ValueOf<typeof E_AREA_CAPABILITY>,
) {
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

    // MASTER (pelo fecho de grupos, nao apenas grupo principal) bypassa as
    // capacidades de area. ADMINISTRATOR nao bypassa — so as capacidades que o
    // seu grupo possui.
    if (await groupResolver.isMaster(user)) return;

    const capabilities = await groupResolver.resolveCapabilities(user);

    if (!capabilities.has(capability)) {
      throw HTTPException.Forbidden(
        'Permissão insuficiente para esta operação',
        'FORBIDDEN',
      );
    }
  };
}
