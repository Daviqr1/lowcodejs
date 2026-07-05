import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableShowSchema } from './show.schema';
import TableShowUseCase from './show.use-case';
import { TableShowParamsValidator } from './show.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableShowUseCase = getInstanceByToken(
      TableShowUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_TABLE',
        }),
      ],
      schema: TableShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableShowParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...params,
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

    return response.status(200).send(result.value);
  }
}
