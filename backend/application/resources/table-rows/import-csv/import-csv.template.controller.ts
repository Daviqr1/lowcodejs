import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { buildCsvFilename } from '@application/core/csv/csv-filename';
import {
  type CsvField,
  buildCsvStream,
} from '@application/core/csv/csv-stream';
import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import TableMongooseRepository from '@application/repositories/table/table.repository';

import { TableRowImportCsvTemplateSchema } from './import-csv.schema';
import { ImportCsvParamsValidator } from './import-csv.validator';

@Controller({
  route: 'tables',
})
export default class {
  @GET({
    url: '/:slug/rows/imports/csv/template',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_TABLE,
        }),
      ],
      schema: TableRowImportCsvTemplateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = ImportCsvParamsValidator.parse(request.params);

    const tableRepo = getInstanceByToken<TableContractRepository>(
      TableMongooseRepository,
    );
    const table = await tableRepo.findBySlug(params.slug);

    if (!table) {
      return response.status(404).send({
        message: 'Tabela não encontrada',
        code: 404,
        cause: 'TABLE_NOT_FOUND',
      });
    }

    const importableFields = table.fields.filter((f) => !f.native);

    const csvFields: CsvField[] = importableFields.map(
      (f): CsvField => ({ label: f.name, value: f.slug }),
    );

    const source = (async function* (): AsyncGenerator<
      Record<string, unknown>
    > {})();

    const stream = buildCsvStream({ source, fields: csvFields });
    const filename = buildCsvFilename('template-' + params.slug);

    return response
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Cache-Control', 'no-store')
      .send(stream);
  }
}
