import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableFieldUpdateSchema } from './update.schema';
import TableFieldUpdateUseCase from './update.use-case';
import {
  TableFieldUpdateBodyValidator,
  TableFieldUpdateParamsValidator,
} from './update.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableFieldUpdateUseCase = getInstanceByToken(
      TableFieldUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '/:slug/fields/:_id',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_FIELD',
        }),
      ],
      schema: TableFieldUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableFieldUpdateBodyValidator.parse(request.body);
    const params = TableFieldUpdateParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...payload,
      tableSlug: params.slug,
      _id: params._id,
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
