import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { GroupRowDeleteSchema } from './delete.schema';
import GroupRowDeleteUseCase from './delete.use-case';
import { GroupRowDeleteParamsValidator } from './delete.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: GroupRowDeleteUseCase = getInstanceByToken(
      GroupRowDeleteUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/rows/:rowId/groups/:groupSlug/:itemId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'REMOVE_ROW',
        }),
      ],
      schema: GroupRowDeleteSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowDeleteParamsValidator.parse(request.params);
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

    return response.status(200).send(null);
  }
}
