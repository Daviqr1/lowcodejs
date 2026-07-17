import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableFieldDeleteSchema } from './delete.schema';
import TableFieldDeleteUseCase from './delete.use-case';
import {
  TableFieldDeleteParamsValidator,
  TableFieldDeleteQueryValidator,
} from './delete.validator';

@Controller({
  route: 'tables',
})
export default class TableFieldDeleteController {
  constructor(
    private readonly useCase: TableFieldDeleteUseCase = getInstanceByToken(
      TableFieldDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/fields/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'REMOVE_FIELD',
        }),
      ],
      schema: TableFieldDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableFieldDeleteParamsValidator.parse(request.params);
    const query = TableFieldDeleteQueryValidator.parse(request.query);
    const result = await this.useCase.execute({ ...params, ...query });

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(200).send(null);
  }
}
