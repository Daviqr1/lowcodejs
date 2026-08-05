import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { RelationshipListBySideSchema } from './list-by-side.schema';
import RelationshipListBySideUseCase from './list-by-side.use-case';
import {
  RelationshipListBySideParamsValidator,
  RelationshipListBySideQueryValidator,
} from './list-by-side.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RelationshipListBySideUseCase = getInstanceByToken(
      RelationshipListBySideUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/relationships/:id/links',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: true }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
      ],
      schema: RelationshipListBySideSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipListBySideParamsValidator.parse(request.params);
    const query = RelationshipListBySideQueryValidator.parse(request.query);

    const result = await this.useCase.execute({ ...params, ...query });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
