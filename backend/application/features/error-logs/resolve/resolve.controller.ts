import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  ErrorLogResolveBodyValidator,
  ErrorLogResolveParamsValidator,
} from '../_shared.validator';

import { ErrorLogResolveSchema } from './resolve.schema';
import ErrorLogResolveUseCase from './resolve.use-case';

@Controller({
  route: '/error-logs',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: ErrorLogResolveUseCase = getInstanceByToken(
      ErrorLogResolveUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:id/resolve',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR]),
      ],
      schema: ErrorLogResolveSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { id } = ErrorLogResolveParamsValidator.parse(request.params);
    const { resolved } = ErrorLogResolveBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ id, resolved });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
