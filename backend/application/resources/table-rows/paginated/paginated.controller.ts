import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableRowPaginatedSchema } from './paginated.schema';
import TableRowPaginatedUseCase from './paginated.use-case';
import {
  TableRowPaginatedParamsValidator,
  TableRowPaginatedQueryValidator,
} from './paginated.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly useCase: TableRowPaginatedUseCase = getInstanceByToken(
      TableRowPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/paginated',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_ROW',
        }),
      ],
      schema: TableRowPaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = TableRowPaginatedQueryValidator.parse(request.query);
    const params = TableRowPaginatedParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...query,
      ...params,
      user: request.user?.sub,
      userJwt: request.user,
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
