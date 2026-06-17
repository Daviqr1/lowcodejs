import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { BulkUpdateSchema } from './bulk-update.schema';
import BulkUpdateUseCase from './bulk-update.use-case';
import {
  BulkUpdateBodyValidator,
  BulkUpdateParamsValidator,
} from './bulk-update.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly useCase: BulkUpdateUseCase = getInstanceByToken(
      BulkUpdateUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/bulk-update',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_ROW',
        }),
      ],
      schema: BulkUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = BulkUpdateParamsValidator.parse(request.params);
    const body = BulkUpdateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...body,
      ...(request?.user?.sub && { __actorUserId: request.user.sub }),
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
