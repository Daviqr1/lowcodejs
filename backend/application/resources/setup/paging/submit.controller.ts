import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { SetupPagingSubmitSchema } from './submit.schema';
import SetupPagingSubmitUseCase from './submit.use-case';
import { SetupPagingBodyValidator } from './submit.validator';

@Controller({
  route: '/setup',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: SetupPagingSubmitUseCase = getInstanceByToken(
      SetupPagingSubmitUseCase,
    ),
  ) {}

  @PUT({
    url: '/step/paging',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: SetupPagingSubmitSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = SetupPagingBodyValidator.parse(request.body);
    const result = await this.useCase.execute(payload);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
