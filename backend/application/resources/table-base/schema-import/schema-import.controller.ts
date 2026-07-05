import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { SchemaImportSchema } from './schema-import.schema';
import SchemaImportUseCase from './schema-import.use-case';
import { SchemaImportBodyValidator } from './schema-import.validator';

@Controller({
  route: 'tables',
})
export default class {
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
        TableAccessMiddleware({ requiredPermission: 'CREATE_TABLE' }),
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

    if (result.isLeft()) {
      const error = result.value;
      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(201).send(result.value);
  }
}
