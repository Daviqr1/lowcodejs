import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { BulkDeleteSchema } from './bulk-delete.schema';
import BulkDeleteUseCase from './bulk-delete.use-case';
import {
  BulkDeleteBodyValidator,
  BulkDeleteParamsValidator,
} from './bulk-delete.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: BulkDeleteUseCase = getInstanceByToken(
      BulkDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/rows/bulk-delete',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'REMOVE_ROW',
        }),
      ],
      schema: BulkDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = BulkDeleteParamsValidator.parse(request.params);
    const body = BulkDeleteBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...params,
      ...body,
      ...(request?.user?.sub && { __actorUserId: request.user.sub }),
      ...(request.ownership?.ownOnly && { __ownOnly: true }),
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
