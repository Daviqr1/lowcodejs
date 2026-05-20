import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableRowCreateSchema } from './create.schema';
import TableRowCreateUseCase from './create.use-case';
import { TableRowCreateParamsValidator } from './create.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly useCase: TableRowCreateUseCase = getInstanceByToken(
      TableRowCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/rows',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: true,
        }),
        TableAccessMiddleware({
          requiredPermission: 'CREATE_ROW',
        }),
      ],
      schema: TableRowCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableRowCreateParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...(request.body as Record<string, any>),
      ...params,
      ...(request?.user?.sub && { creator: request.user.sub }),
      ...(request?.user && { __actorUserJwt: request.user }),
    });

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        errors: error.errors,
      });
    }

    return response.status(201).send(result.value);
  }
}
