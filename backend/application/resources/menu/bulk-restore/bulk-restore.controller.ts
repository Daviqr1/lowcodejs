import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { MenuBulkRestoreSchema } from './bulk-restore.schema';
import MenuBulkRestoreUseCase from './bulk-restore.use-case';
import { MenuBulkRestoreBodyValidator } from './bulk-restore.validator';

@Controller({
  route: '/menu',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: MenuBulkRestoreUseCase = getInstanceByToken(
      MenuBulkRestoreUseCase,
    ),
  ) {}

  @PATCH({
    url: '/bulk-restore',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU),
      ],
      schema: MenuBulkRestoreSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = MenuBulkRestoreBodyValidator.parse(request.body);

    const result = await this.useCase.execute(body);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
