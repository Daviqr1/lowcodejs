import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableRowEvaluationSchema } from './evaluation.schema';
import TableRowEvaluationUseCase from './evaluation.use-case';
import {
  TableRowEvaluationBodyValidator,
  TableRowEvaluationParamsValidator,
} from './evaluation.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableRowEvaluationUseCase = getInstanceByToken(
      TableRowEvaluationUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/rows/:_id/evaluation',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_ROW',
        }),
      ],
      schema: TableRowEvaluationSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableRowEvaluationBodyValidator.parse(request.body);
    const params = TableRowEvaluationParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...payload,
      ...params,
      user: request.user.sub,
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
