import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  UserGroupUpdateBodyValidator,
  UserGroupIdentifierParamsValidator,
} from '../_shared.validator';

import { UserGroupUpdateSchema } from './update.schema';
import UserGroupUpdateUseCase from './update.use-case';

@Controller({
  route: '/user-group',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserGroupUpdateUseCase = getInstanceByToken(
      UserGroupUpdateUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS),
      ],
      schema: UserGroupUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = UserGroupIdentifierParamsValidator.parse(request.params);
    const payload = UserGroupUpdateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...payload,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
