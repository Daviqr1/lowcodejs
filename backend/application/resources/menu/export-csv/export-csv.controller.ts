import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { buildCsvFilename } from '@application/core/csv/csv-filename';
import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { MenuExportCsvSchema } from './export-csv.schema';
import MenuExportCsvUseCase from './export-csv.use-case';
import { MenuExportCsvQueryValidator } from './export-csv.validator';

@Controller({
  route: '/menu',
})
export default class {
  constructor(
    private readonly useCase: MenuExportCsvUseCase = getInstanceByToken(
      MenuExportCsvUseCase,
    ),
  ) {}

  @GET({
    url: '/exports/csv',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_MENU),
      ],
      schema: MenuExportCsvSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = MenuExportCsvQueryValidator.parse(request.query);

    const result = await this.useCase.execute(query);

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    const filename = buildCsvFilename('menus');

    return response
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Cache-Control', 'no-store')
      .send(result.value);
  }
}
