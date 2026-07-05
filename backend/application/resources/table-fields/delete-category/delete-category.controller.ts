import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, DELETE, getInstanceByToken } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableFieldDeleteCategorySchema } from './delete-category.schema';
import TableFieldDeleteCategoryUseCase from './delete-category.use-case';
import { TableFieldDeleteCategoryParamsValidator } from './delete-category.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableFieldDeleteCategoryUseCase = getInstanceByToken(
      TableFieldDeleteCategoryUseCase,
    ),
  ) {}

  @DELETE({
    url: '/:slug/fields/:_id/category/:categoryId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_FIELD',
        }),
      ],
      schema: TableFieldDeleteCategorySchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = TableFieldDeleteCategoryParamsValidator.parse(
      request.params,
    );

    const result = await this.useCase.execute(params);

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
