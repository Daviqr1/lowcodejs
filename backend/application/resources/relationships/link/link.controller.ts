import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { RelationshipLinkSchema } from './link.schema';
import RelationshipLinkUseCase from './link.use-case';
import {
  RelationshipLinkBodyValidator,
  RelationshipLinkParamsValidator,
} from './link.validator';

@Controller({
  route: 'tables',
})
export default class {
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
        TableAccessMiddleware({ requiredPermission: 'CREATE_ROW' }),
      ],
      schema: RelationshipLinkSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipLinkParamsValidator.parse(request.params);
    const body = RelationshipLinkBodyValidator.parse(request.body);

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

    return response.status(201).send(result.value);
  }
}
