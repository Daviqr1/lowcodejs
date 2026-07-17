import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableUpdateSchema } from './update.schema';
import TableUpdateUseCase from './update.use-case';
import {
  TableUpdateBodyValidator,
  TableUpdateParamsValidator,
} from './update.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableUpdateUseCase = getInstanceByToken(
      TableUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '/:slug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_TABLE',
        }),
      ],
      schema: TableUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableUpdateBodyValidator.parse(request.body);
    const params = TableUpdateParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      routeSlug: params.slug,
      ...payload,
      actorId: request.user?.sub,
      actorIsOwner: request.ownership?.isOwner ?? false,
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
