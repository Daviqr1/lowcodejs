import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  TableUpdateBodyValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

import { TableUpdateSchema } from './update.schema';
import TableUpdateUseCase from './update.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableUpdateUseCase = getInstanceByToken(
      TableUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '/:slug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_TABLE,
        }),
      ],
      schema: TableUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableUpdateBodyValidator.parse(request.body);
    const params = TableSlugParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      routeSlug: params.slug,
      ...payload,
      actorId: request.user?.sub,
      actorIsOwner: request.ownership?.isOwner ?? false,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
