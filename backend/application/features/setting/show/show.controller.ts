import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import UserMongooseRepository from '@application/repositories/user/user.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { SettingShowSchema } from './show.schema';
import SettingShowUseCase from './show.use-case';

@Controller({
  route: '/setting',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: SettingShowUseCase = getInstanceByToken(
      SettingShowUseCase,
    ),
    private readonly userRepository: UserContractRepository = getInstanceByToken(
      UserMongooseRepository,
    ),
    private readonly groupResolver: GroupResolverContractService = getInstanceByToken(
      GroupResolverService,
    ),
  ) {}

  @GET({
    url: '',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: SettingShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const user = await this.userRepository.findById(request.user?.sub ?? '');
    const capabilities = await this.groupResolver.resolveCapabilities(user);
    const isMaster = await this.groupResolver.isMaster(user);

    const result = await this.useCase.execute({
      canManageSettings:
        isMaster || capabilities.has(E_AREA_CAPABILITY.MANAGE_SETTINGS),
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.send(result.value);
  }
}
