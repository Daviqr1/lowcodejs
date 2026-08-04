import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { RelationshipReorderSchema } from './reorder.schema';
import RelationshipReorderUseCase from './reorder.use-case';
import {
  RelationshipReorderBodyValidator,
  RelationshipReorderParamsValidator,
} from './reorder.validator';

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
        TableAccessMiddleware({ requiredPermission: 'UPDATE_ROW' }),
      ],
      schema: RelationshipReorderSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipReorderParamsValidator.parse(request.params);
    const body = RelationshipReorderBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ ...params, ...body });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(204).send();
  }
}
