import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  UserUpdateBodyValidator,
  UserIdentifierParamsValidator,
} from '../_shared.validator';

import { UserUpdateSchema } from './update.schema';
import UserUpdateUseCase from './update.use-case';

@Controller({
  route: '/users',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserUpdateUseCase = getInstanceByToken(
      UserUpdateUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USERS),
      ],
      schema: UserUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = UserIdentifierParamsValidator.parse(request.params);
    const payload = UserUpdateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...payload,
      actorId: request.user?.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
