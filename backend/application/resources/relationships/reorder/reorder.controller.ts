import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  RelationshipReorderBodyValidator,
  RelationshipIdParamsValidator,
} from '../_shared.validator';

import { RelationshipReorderSchema } from './reorder.schema';
import RelationshipReorderUseCase from './reorder.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RelationshipReorderUseCase = getInstanceByToken(
      RelationshipReorderUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/relationships/:id/links/reorder',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_ROW,
        }),
      ],
      schema: RelationshipReorderSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipIdParamsValidator.parse(request.params);
    const body = RelationshipReorderBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ ...params, ...body });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(204).send();
  }
}
