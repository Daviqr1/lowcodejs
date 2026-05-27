import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { BulkTrashSchema } from './bulk-trash.schema';
import BulkTrashUseCase from './bulk-trash.use-case';
import {
  BulkTrashBodyValidator,
  BulkTrashParamsValidator,
} from './bulk-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly useCase: BulkTrashUseCase = getInstanceByToken(
      BulkTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/bulk-trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_ROW',
        }),
      ],
      schema: BulkTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = BulkTrashParamsValidator.parse(request.params);
    const body = BulkTrashBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...body,
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
