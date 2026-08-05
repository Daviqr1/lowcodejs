import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupFieldParamsValidator } from '../_shared.validator';

import { GroupFieldRemoveFromTrashSchema } from './remove-from-trash.schema';
import GroupFieldRemoveFromTrashUseCase from './remove-from-trash.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupFieldRemoveFromTrashUseCase = getInstanceByToken(
      GroupFieldRemoveFromTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/groups/:groupSlug/fields/:fieldId/restore',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_FIELD,
        }),
      ],
      schema: GroupFieldRemoveFromTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupFieldParamsValidator.parse(request.params);

    const result = await this.useCase.execute({ ...params });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
