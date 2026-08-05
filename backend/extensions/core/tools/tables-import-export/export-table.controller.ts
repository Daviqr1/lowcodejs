import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_EXTENSION_TYPE } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { ExportTableValidator } from './_shared.validator';
import { ExportTableSchema } from './export-table.schema';
import ExportTableUseCase from './export-table.use-case';

@Controller({
  route: '/tools',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: ExportTableUseCase = getInstanceByToken(
      ExportTableUseCase,
    ),
  ) {}

  @POST({
    url: '/export-table',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        ExtensionActiveMiddleware({
          pkg: 'core',
          type: E_EXTENSION_TYPE.TOOL,
          extensionId: 'tables-import-export',
        }),
      ],
      schema: ExportTableSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = ExportTableValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...body,
      userId: request.user.sub,
      userName: request.user.email,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
