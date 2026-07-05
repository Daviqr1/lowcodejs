import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableCreateSchema } from './create.schema';
import TableCreateUseCase from './create.use-case';
import { TableCreateBodyValidator } from './create.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableCreateUseCase = getInstanceByToken(
      TableCreateUseCase,
    ),
  ) {}

  @POST({
    url: '',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'CREATE_TABLE',
        }),
      ],
      schema: TableCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableCreateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...payload,
      owner: request.user.sub,
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
