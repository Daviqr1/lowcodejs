import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UserGroupPaginatedQueryValidator } from '../_shared.validator';

import { UserGroupPaginatedSchema } from './paginated.schema';
import UserGroupPaginatedUseCase from './paginated.use-case';

@Controller({
  route: 'user-group',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserGroupPaginatedUseCase = getInstanceByToken(
      UserGroupPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/paginated',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS),
      ],
      schema: UserGroupPaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = UserGroupPaginatedQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...query,
      user: {
        _id: request?.user?.sub,
        role: request?.user?.role,
      },
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
