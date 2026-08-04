import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableRowRemoveFromTrashSchema } from './remove-from-trash.schema';
import TableRowRemoveFromTrashUseCase from './remove-from-trash.use-case';
import { TableRowRemoveFromTrashParamsValidator } from './remove-from-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableRowRemoveFromTrashUseCase = getInstanceByToken(
      TableRowRemoveFromTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/:_id/restore',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_ROW',
        }),
      ],
      schema: TableRowRemoveFromTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableRowRemoveFromTrashParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...params,
      ...(request?.user?.sub && { __actorUserId: request.user.sub }),
      ...(request.ownership?.ownOnly && { __ownOnly: true }),
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
