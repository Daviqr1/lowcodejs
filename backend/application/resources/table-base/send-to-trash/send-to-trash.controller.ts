import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableSendToTrashSchema } from './send-to-trash.schema';
import TableSendToTrashUseCase from './send-to-trash.use-case';
import { TableSendToTrashParamsValidator } from './send-to-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableSendToTrashUseCase = getInstanceByToken(
      TableSendToTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_TABLE',
        }),
      ],
      schema: TableSendToTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableSendToTrashParamsValidator.parse(request.params);

    const result = await this.useCase.execute(params);

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
