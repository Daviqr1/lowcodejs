import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { GroupFieldRemoveFromTrashSchema } from './remove-from-trash.schema';
import GroupFieldRemoveFromTrashUseCase from './remove-from-trash.use-case';
import { GroupFieldRemoveFromTrashParamsValidator } from './remove-from-trash.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: GroupFieldRemoveFromTrashUseCase = getInstanceByToken(
      GroupFieldRemoveFromTrashUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/groups/:groupSlug/fields/:fieldId/restore',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_FIELD',
        }),
      ],
      schema: GroupFieldRemoveFromTrashSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupFieldRemoveFromTrashParamsValidator.parse(
      request.params,
    );

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
