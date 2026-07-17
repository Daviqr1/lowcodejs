import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { GroupRowListSchema } from './list.schema';
import GroupRowListUseCase from './list.use-case';
import { GroupRowListParamsValidator } from './list.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: GroupRowListUseCase = getInstanceByToken(
      GroupRowListUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/rows/:rowId/groups/:groupSlug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_ROW',
        }),
      ],
      schema: GroupRowListSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowListParamsValidator.parse(request.params);
    const result = await this.useCase.execute({ ...params });

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
