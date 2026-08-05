import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { RelationshipCreateSchema } from './create.schema';
import RelationshipCreateUseCase from './create.use-case';
import {
  RelationshipCreateBodyValidator,
  RelationshipCreateParamsValidator,
} from './create.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RelationshipCreateUseCase = getInstanceByToken(
      RelationshipCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/relationships',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_FIELD,
        }),
      ],
      schema: RelationshipCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipCreateParamsValidator.parse(request.params);
    const body = RelationshipCreateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ ...params, ...body });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
