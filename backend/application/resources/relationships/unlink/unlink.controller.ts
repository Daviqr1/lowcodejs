import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { RelationshipUnlinkSchema } from './unlink.schema';
import RelationshipUnlinkUseCase from './unlink.use-case';
import { RelationshipUnlinkParamsValidator } from './unlink.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: RelationshipUnlinkUseCase = getInstanceByToken(
      RelationshipUnlinkUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/relationships/:id/links/:linkId',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({ requiredPermission: 'UPDATE_ROW' }),
      ],
      schema: RelationshipUnlinkSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipUnlinkParamsValidator.parse(request.params);

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
