import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableRowReactionSchema } from './reaction.schema';
import TableRowReactionUseCase from './reaction.use-case';
import {
  TableRowReactionBodyValidator,
  TableRowReactionParamsValidator,
} from './reaction.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableRowReactionUseCase = getInstanceByToken(
      TableRowReactionUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/rows/:_id/reaction',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_ROW,
        }),
      ],
      schema: TableRowReactionSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableRowReactionBodyValidator.parse(request.body);
    const params = TableRowReactionParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...payload,
      ...params,
      user: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
