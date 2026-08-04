import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import type { RowPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupRowCreateSchema } from './create.schema';
import GroupRowCreateUseCase from './create.use-case';
import { GroupRowCreateParamsValidator } from './create.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupRowCreateUseCase = getInstanceByToken(
      GroupRowCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/rows/:rowId/groups/:groupSlug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'CREATE_ROW',
        }),
      ],
      schema: GroupRowCreateSchema,
    },
  })
  async handle(
    request: FastifyRequest<{ Body: RowPayload }>,
    response: FastifyReply,
  ): Promise<void> {
    const params = GroupRowCreateParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...request.body,
      ...params,
      ...(request?.user?.sub && { creator: request.user.sub }),
      __actorUserId: request.user?.sub,
      __ownOnly: request.ownership?.ownOnly,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
