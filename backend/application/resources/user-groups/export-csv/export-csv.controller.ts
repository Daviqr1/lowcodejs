import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { buildCsvFilename } from '@application/core/csv/csv-filename';
import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { UserGroupExportCsvSchema } from './export-csv.schema';
import UserGroupExportCsvUseCase from './export-csv.use-case';
import { UserGroupExportCsvQueryValidator } from './export-csv.validator';

@Controller({
  route: 'user-group',
})
export default class {
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

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    const filename = buildCsvFilename('grupos');

    return response
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .header('Cache-Control', 'no-store')
      .send(result.value);
  }
}
