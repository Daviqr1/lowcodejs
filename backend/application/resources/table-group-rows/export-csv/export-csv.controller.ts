import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import { CsvExportContractService } from '@application/services/csv-export/csv-export-contract.service';
import CsvExportService from '@application/services/csv-export/csv-export.service';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupRowExportCsvSchema } from './export-csv.schema';
import GroupRowExportCsvUseCase from './export-csv.use-case';
import { GroupRowExportCsvParamsValidator } from './export-csv.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupRowExportCsvUseCase = getInstanceByToken(
      GroupRowExportCsvUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/:rowId/groups/:groupSlug/exports/csv',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
      ],
      schema: GroupRowExportCsvSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowExportCsvParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...params,
      __actorUserId: request.user?.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const filename = getInstanceByToken<CsvExportContractService>(
      CsvExportService,
    ).filename(`tabela-${params.slug}-grupo-${params.groupSlug}`);

    return response
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Cache-Control', 'no-store')
      .send(result.value);
  }
}
