import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import { CsvExportContractService } from '@application/services/csv-export/csv-export-contract.service';
import CsvExportService from '@application/services/csv-export/csv-export.service';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { MenuExportCsvQueryValidator } from '../_shared.validator';

import { MenuExportCsvSchema } from './export-csv.schema';
import MenuExportCsvUseCase from './export-csv.use-case';

@Controller({
  route: '/menu',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: MenuExportCsvUseCase = getInstanceByToken(
      MenuExportCsvUseCase,
    ),
    private readonly csvExport: CsvExportContractService = getInstanceByToken(
      CsvExportService,
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

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const filename = this.csvExport.filename('menus');

    return this.http.sendCsv(response, filename, result.value);
  }
}
