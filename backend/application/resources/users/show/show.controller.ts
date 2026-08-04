import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import { UserMapperContractService } from '@application/services/user-mapper/user-mapper-contract.service';
import UserMapperService from '@application/services/user-mapper/user-mapper.service';

import { UserShowSchema } from './show.schema';
import UserShowUseCase from './show.use-case';
import { UserShowParamValidator } from './show.validator';

const userMapper =
  getInstanceByToken<UserMapperContractService>(UserMapperService);

@Controller({
  route: '/users',
})
export default class {
  constructor(
    private readonly useCase: UserShowUseCase = getInstanceByToken(
      UserShowUseCase,
    ),
  ) {}

  @GET({
    url: '/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: UserShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = UserShowParamValidator.parse(request.params);

    const result = await this.useCase.execute(params);

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(userMapper.toResponse(result.value));
  }
}
