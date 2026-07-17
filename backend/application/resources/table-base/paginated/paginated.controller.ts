import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';

import { TablePaginatedSchema } from './paginated.schema';
import TablePaginatedUseCase from './paginated.use-case';
import { TablePaginatedQueryValidator } from './paginated.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TablePaginatedUseCase = getInstanceByToken(
      TablePaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/paginated',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        // Sem TableAccessMiddleware - não tem slug específico
        // Implementar lógica de filtro no handler (usuário vê apenas suas tabelas ou públicas)

        // TableAccessMiddleware({
        //   requiredPermission: 'VIEW_TABLE',
        // }),
      ],
      schema: TablePaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const query = TablePaginatedQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...query,
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

    return response.status(200).send(result.value);
  }
}
