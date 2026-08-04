import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import type { RowPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupRowUpdateSchema } from './update.schema';
import GroupRowUpdateUseCase from './update.use-case';
import { GroupRowUpdateParamsValidator } from './update.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupRowUpdateUseCase = getInstanceByToken(
      GroupRowUpdateUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/:rowId/groups/:groupSlug/:itemId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_ROW',
        }),
      ],
      schema: GroupRowUpdateSchema,
    },
  })
  async handle(
    request: FastifyRequest<{ Body: RowPayload }>,
    response: FastifyReply,
  ): Promise<void> {
    const params = GroupRowUpdateParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...request.body,
      ...params,
      ...(request?.user?.sub && { __actorUserId: request.user.sub }),
      ...(request.ownership?.ownOnly && { __ownOnly: true }),
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
