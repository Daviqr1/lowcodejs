import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableRowAutoSaveSchema } from './auto-save.schema';
import TableRowAutoSaveUseCase from './auto-save.use-case';
import {
  TableRowAutoSaveBodyValidator,
  TableRowAutoSaveParamsValidator,
  TableRowAutoSaveQueryValidator,
} from './auto-save.validator';
@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableRowAutoSaveUseCase = getInstanceByToken(
      TableRowAutoSaveUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/auto-save',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'CREATE_ROW',
        }),
      ],
      schema: TableRowAutoSaveSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableRowAutoSaveParamsValidator.parse(request.params);
    const payload = TableRowAutoSaveBodyValidator.parse(request.body);
    const query = TableRowAutoSaveQueryValidator.parse(request.query);

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
