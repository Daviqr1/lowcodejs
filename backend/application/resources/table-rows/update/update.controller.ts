import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import type { RowPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableRowUpdateSchema } from './update.schema';
import TableRowUpdateUseCase from './update.use-case';
import { TableRowUpdateParamsValidator } from './update.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableRowUpdateUseCase = getInstanceByToken(
      TableRowUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '/:slug/rows/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_ROW',
        }),
      ],
      schema: TableRowUpdateSchema,
    },
  })
  async handle(
    request: FastifyRequest<{ Body: RowPayload }>,
    response: FastifyReply,
  ): Promise<void> {
    const params = TableRowUpdateParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...request.body,
      ...params,
      ...(request?.user?.sub && { __actorUserId: request.user.sub }),
      ...(request.ownership?.ownOnly && { __ownOnly: true }),
      __isOwner: request.ownership?.isOwner,
      __isAdministrator: request.ownership?.isAdministrator,
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
