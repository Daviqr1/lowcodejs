import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { buildCsvFilename } from '@application/core/csv/csv-filename';
import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableRowExportCsvSchema } from './export-csv.schema';
import TableRowExportCsvUseCase from './export-csv.use-case';
import {
  TableRowExportCsvParamsValidator,
  TableRowExportCsvQueryValidator,
} from './export-csv.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableRowExportCsvUseCase = getInstanceByToken(
      TableRowExportCsvUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/exports/csv',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
      ],
      schema: TableRowExportCsvSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableRowExportCsvParamsValidator.parse(request.params);
    const query = TableRowExportCsvQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...query,
      ...params,
      user: request.user?.sub,
    });

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    const filename = buildCsvFilename(`tabela-${params.slug}`);

    return response
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Cache-Control', 'no-store')
      .send(result.value);
  }
}
