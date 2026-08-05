import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  RelationshipLinkBodyValidator,
  RelationshipIdParamsValidator,
} from '../_shared.validator';

import { RelationshipLinkSchema } from './link.schema';
import RelationshipLinkUseCase from './link.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RelationshipLinkUseCase = getInstanceByToken(
      RelationshipLinkUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/relationships/:id/links',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_ROW,
        }),
      ],
      schema: RelationshipLinkSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipIdParamsValidator.parse(request.params);
    const body = RelationshipLinkBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ ...params, ...body });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
