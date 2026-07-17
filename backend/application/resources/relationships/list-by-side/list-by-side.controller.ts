import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

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
        TableAccessMiddleware({ requiredPermission: 'VIEW_ROW' }),
      ],
      schema: RelationshipListBySideSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipListBySideParamsValidator.parse(request.params);
    const query = RelationshipListBySideQueryValidator.parse(request.query);

    const result = await this.useCase.execute({ ...params, ...query });

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        errors: error.errors,
      });
    }

    return response.status(200).send(result.value);
  }
}
