import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableFieldSendToTrashSchema } from './send-to-trash.schema';
import TableFieldSendToTrashUseCase from './send-to-trash.use-case';
import { TableFieldSendToTrashParamsValidator } from './send-to-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableFieldSendToTrashUseCase = getInstanceByToken(
      TableFieldSendToTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/fields/:_id/trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_FIELD',
        }),
      ],
      schema: TableFieldSendToTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableFieldSendToTrashParamsValidator.parse(request.params);

    const result = await this.useCase.execute({ ...params });

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
