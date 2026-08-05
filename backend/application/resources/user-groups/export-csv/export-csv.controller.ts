import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';
import { CsvExportContractService } from '@application/services/csv-export/csv-export-contract.service';
import CsvExportService from '@application/services/csv-export/csv-export.service';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { UserGroupExportCsvQueryValidator } from '../_shared.validator';

import { UserGroupExportCsvSchema } from './export-csv.schema';
import UserGroupExportCsvUseCase from './export-csv.use-case';

@Controller({
  route: 'user-group',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UserGroupExportCsvUseCase = getInstanceByToken(
      UserGroupExportCsvUseCase,
    ),
  ) {}

  @GET({
    url: '/exports/csv',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_USER_GROUPS),
      ],
      schema: UserGroupExportCsvSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = UserGroupExportCsvQueryValidator.parse(request.query);

    const user =
      (request?.user && {
        _id: request.user.sub,
        role: request.user.role,
      }) ||
      undefined;
    const result = await this.useCase.execute({
      ...query,
      user,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    const filename =
      getInstanceByToken<CsvExportContractService>(CsvExportService).filename(
        'grupos',
      );

    return this.http.sendCsv(response, filename, result.value);
  }
}
