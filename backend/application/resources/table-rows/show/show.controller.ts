import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableRowShowSchema } from './show.schema';
import TableRowShowUseCase from './show.use-case';
import { TableRowShowParamsValidator } from './show.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableRowShowUseCase = getInstanceByToken(
      TableRowShowUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_ROW',
        }),
      ],
      schema: TableRowShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableRowShowParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...params,
      user: request.user?.sub,
      isOwner: request.ownership?.isOwner,
      isAdministrator: request.ownership?.isAdministrator,
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
