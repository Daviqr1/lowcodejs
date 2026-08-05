import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { SetupUploadBodyValidator } from '../_shared.validator';

import { SetupUploadSubmitSchema } from './submit.schema';
import SetupUploadSubmitUseCase from './submit.use-case';

@Controller({
  route: '/setup',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: SetupUploadSubmitUseCase = getInstanceByToken(
      SetupUploadSubmitUseCase,
    ),
  ) {}

  @PUT({
    url: '/step/upload',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER]),
      ],
      schema: SetupUploadSubmitSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = SetupUploadBodyValidator.parse(request.body);
    const result = await this.useCase.execute(payload);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
