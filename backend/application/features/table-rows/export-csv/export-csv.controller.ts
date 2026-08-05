import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import { CsvExportContractService } from '@application/services/csv-export/csv-export-contract.service';
import CsvExportService from '@application/services/csv-export/csv-export.service';
import HttpResponseService from '@application/services/http-response/http-response.service';

import {
  TableSlugParamsValidator,
  TableRowExportCsvQueryValidator,
} from '../_shared.validator';

import { TableRowExportCsvSchema } from './export-csv.schema';
import TableRowExportCsvUseCase from './export-csv.use-case';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableRowExportCsvUseCase = getInstanceByToken(
      TableRowExportCsvUseCase,
    ),
    private readonly csvExport: CsvExportContractService = getInstanceByToken(
      CsvExportService,
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
    const params = TableSlugParamsValidator.parse(request.params);
    const query = TableRowExportCsvQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...query,
      ...params,
      user: request.user?.sub,
      isOwner: request.ownership?.isOwner,
      isAdministrator: request.ownership?.isAdministrator,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const filename = this.csvExport.filename(`tabela-${params.slug}`);

    return this.http.sendCsv(response, filename, result.value);
  }
}
