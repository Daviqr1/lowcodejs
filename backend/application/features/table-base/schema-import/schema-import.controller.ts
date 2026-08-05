import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_TABLE_PERMISSION } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { SchemaImportSchema } from './schema-import.schema';
import SchemaImportUseCase from './schema-import.use-case';
import { SchemaImportBodyValidator } from './schema-import.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: SchemaImportUseCase = getInstanceByToken(
      SchemaImportUseCase,
    ),
  ) {}

  @POST({
    url: '/schema-import',
    options: {
      bodyLimit: 5 * 1024 * 1024,
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_TABLE,
        }),
      ],
      schema: SchemaImportSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = SchemaImportBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      yaml: body.yaml,
      ownerId: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
