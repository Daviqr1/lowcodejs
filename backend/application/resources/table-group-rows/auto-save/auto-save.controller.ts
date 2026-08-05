import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupRowAutoSaveSchema } from './auto-save.schema';
import GroupRowAutoSaveUseCase from './auto-save.use-case';
import {
  GroupRowAutoSaveBodyValidator,
  GroupRowAutoSaveParamsValidator,
  GroupRowAutoSaveQueryValidator,
} from './auto-save.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupRowAutoSaveUseCase = getInstanceByToken(
      GroupRowAutoSaveUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/:rowId/groups/:groupSlug/auto-save',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_ROW,
        }),
      ],
      schema: GroupRowAutoSaveSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowAutoSaveParamsValidator.parse(request.params);
    const payload = GroupRowAutoSaveBodyValidator.parse(request.body);
    const query = GroupRowAutoSaveQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...payload,
      ...params,
      ...query,
      ...(request?.user?.sub && { creator: request.user.sub }),
      __actorUserId: request.user?.sub,
      __ownOnly: request.ownership?.ownOnly,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
