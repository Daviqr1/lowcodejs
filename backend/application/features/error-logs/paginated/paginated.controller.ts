import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { ErrorLogPaginatedQueryValidator } from '../_shared.validator';

import { ErrorLogPaginatedSchema } from './paginated.schema';
import ErrorLogPaginatedUseCase from './paginated.use-case';

@Controller({
  route: '/error-logs',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: ErrorLogPaginatedUseCase = getInstanceByToken(
      ErrorLogPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/paginated',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR]),
      ],
      schema: ErrorLogPaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = ErrorLogPaginatedQueryValidator.parse(request.query);

    const result = await this.useCase.execute(query);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
