import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { RoleMiddleware } from '@application/middlewares/role.middleware';
import { CsvExportContractService } from '@application/services/csv-export/csv-export-contract.service';
import CsvExportService from '@application/services/csv-export/csv-export.service';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableExportCsvSchema } from './export-csv.schema';
import TableExportCsvUseCase from './export-csv.use-case';
import { TableExportCsvQueryValidator } from './export-csv.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableExportCsvUseCase = getInstanceByToken(
      TableExportCsvUseCase,
    ),
  ) {}

  @GET({
    url: '/exports/csv',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        RoleMiddleware([E_ROLE.MASTER, E_ROLE.ADMINISTRATOR]),
      ],
      schema: TableExportCsvSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = TableExportCsvQueryValidator.parse(request.query);

    const result = await this.useCase.execute(query);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const filename =
      getInstanceByToken<CsvExportContractService>(CsvExportService).filename(
        'tabelas',
      );

    return this.http.sendCsv(response, filename, result.value);
  }
}
