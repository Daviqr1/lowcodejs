import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';
import z from 'zod';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { EmptyTrashSchema } from './empty-trash.schema';
import EmptyTrashUseCase from './empty-trash.use-case';

const ParamsValidator = z.object({
  slug: z.string().trim(),
});

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: EmptyTrashUseCase = getInstanceByToken(
      EmptyTrashUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/rows/empty-trash',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'REMOVE_ROW',
        }),
      ],
      schema: EmptyTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = ParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...params,
      ...(request?.user?.sub && { __actorUserId: request.user.sub }),
      ...(request.ownership?.ownOnly && { __ownOnly: true }),
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
