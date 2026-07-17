import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { GroupRowPaginatedSchema } from './paginated.schema';
import GroupRowPaginatedUseCase from './paginated.use-case';
import {
  GroupRowPaginatedParamsValidator,
  GroupRowPaginatedQueryValidator,
} from './paginated.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: GroupRowPaginatedUseCase = getInstanceByToken(
      GroupRowPaginatedUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/:rowId/groups/:groupSlug/paginated',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_ROW',
        }),
      ],
      schema: GroupRowPaginatedSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowPaginatedParamsValidator.parse(request.params);
    const query = GroupRowPaginatedQueryValidator.parse(request.query);

    const result = await this.useCase.execute({ ...params, ...query });

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
