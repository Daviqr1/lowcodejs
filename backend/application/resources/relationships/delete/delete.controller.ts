import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { RelationshipDeleteSchema } from './delete.schema';
import RelationshipDeleteUseCase from './delete.use-case';
import { RelationshipDeleteParamsValidator } from './delete.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: RelationshipDeleteUseCase = getInstanceByToken(
      RelationshipDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/relationships/:id',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({ requiredPermission: 'UPDATE_FIELD' }),
      ],
      schema: RelationshipDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipDeleteParamsValidator.parse(request.params);

    const result = await this.useCase.execute(params);

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
