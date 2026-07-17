import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { GroupFieldShowSchema } from './show.schema';
import GroupFieldShowUseCase from './show.use-case';
import { GroupFieldShowParamsValidator } from './show.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: GroupFieldShowUseCase = getInstanceByToken(
      GroupFieldShowUseCase,
    ),
  ) {}

  @GET({
    url: '/:slug/groups/:groupSlug/fields/:fieldId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'VIEW_FIELD',
        }),
      ],
      schema: GroupFieldShowSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupFieldShowParamsValidator.parse(request.params);
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
