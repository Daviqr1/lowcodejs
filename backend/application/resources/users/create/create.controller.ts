import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';
import { UserMapperContractService } from '@application/services/user-mapper/user-mapper-contract.service';
import UserMapperService from '@application/services/user-mapper/user-mapper.service';

import { UserCreateSchema } from './create.schema';
import UserCreateUseCase from './create.use-case';
import { UserCreateBodyValidator } from './create.validator';

const userMapper =
  getInstanceByToken<UserMapperContractService>(UserMapperService);

@Controller()
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserCreateUseCase = getInstanceByToken(
      UserCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/users',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: UserCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = UserCreateBodyValidator.parse(request.body);

    const result = await this.useCase.execute(body);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(userMapper.toResponse(result.value));
  }
}
