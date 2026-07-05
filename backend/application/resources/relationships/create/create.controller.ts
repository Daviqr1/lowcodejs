import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

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
        TableAccessMiddleware({ requiredPermission: 'CREATE_FIELD' }),
      ],
      schema: RelationshipCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipCreateParamsValidator.parse(request.params);
    const body = RelationshipCreateBodyValidator.parse(request.body);

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
