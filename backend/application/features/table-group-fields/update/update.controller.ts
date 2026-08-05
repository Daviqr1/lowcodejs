import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  GroupFieldUpdateBodyValidator,
  GroupFieldParamsValidator,
} from '../_shared.validator';

import { GroupFieldUpdateSchema } from './update.schema';
import GroupFieldUpdateUseCase from './update.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupFieldUpdateUseCase = getInstanceByToken(
      GroupFieldUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '/:slug/groups/:groupSlug/fields/:fieldId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_FIELD,
        }),
      ],
      schema: GroupFieldUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = GroupFieldUpdateBodyValidator.parse(request.body);
    const params = GroupFieldParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...payload,
      tableSlug: params.slug,
      groupSlug: params.groupSlug,
      fieldId: params.fieldId,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
