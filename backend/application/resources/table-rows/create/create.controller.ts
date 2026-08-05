import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import type { RowPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableRowCreateSchema } from './create.schema';
import TableRowCreateUseCase from './create.use-case';
import { TableRowCreateParamsValidator } from './create.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableRowCreateUseCase = getInstanceByToken(
      TableRowCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/rows',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_ROW,
        }),
      ],
      schema: TableRowCreateSchema,
    },
  })
  async handle(
    request: FastifyRequest<{ Body: RowPayload }>,
    response: FastifyReply,
  ): Promise<void> {
    const params = TableRowCreateParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...request.body,
      ...params,
      ...(request?.user?.sub && { creator: request.user.sub }),
      __isOwner: request.ownership?.isOwner,
      __isAdministrator: request.ownership?.isAdministrator,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
