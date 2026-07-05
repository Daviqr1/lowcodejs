import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

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

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        errors: error.errors,
      });
    }

    return response.status(204).send();
  }
}
