import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableFieldRemoveFromTrashSchema } from './remove-from-trash.schema';
import TableFieldRemoveFromTrashUseCase from './remove-from-trash.use-case';
import { TableFieldRemoveFromTrashParamsValidator } from './remove-from-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableFieldRemoveFromTrashUseCase = getInstanceByToken(
      TableFieldRemoveFromTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/fields/:_id/restore',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_FIELD',
        }),
      ],
      schema: TableFieldRemoveFromTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableFieldRemoveFromTrashParamsValidator.parse(
      request.params,
    );

    const result = await this.useCase.execute({ ...params });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
