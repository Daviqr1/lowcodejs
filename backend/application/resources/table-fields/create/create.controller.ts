import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableFieldCreateSchema } from './create.schema';
import TableFieldCreateUseCase from './create.use-case';
import {
  TableFieldCreateBodyValidator,
  TableFieldCreateParamsValidator,
} from './create.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableFieldCreateUseCase = getInstanceByToken(
      TableFieldCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/fields',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'CREATE_FIELD',
        }),
      ],
      schema: TableFieldCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableFieldCreateBodyValidator.parse(request.body);
    const params = TableFieldCreateParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...payload,
      tableSlug: params.slug,
    });

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(201).send(result.value);
  }
}
