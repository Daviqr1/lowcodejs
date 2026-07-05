import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { TableFieldSuggestSlugSchema } from './suggest-slug.schema';
import TableFieldSuggestSlugUseCase from './suggest-slug.use-case';
import {
  TableFieldSuggestSlugBodyValidator,
  TableFieldSuggestSlugParamsValidator,
} from './suggest-slug.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: TableFieldSuggestSlugUseCase = getInstanceByToken(
      TableFieldSuggestSlugUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/fields/suggest-slug',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'CREATE_FIELD',
        }),
      ],
      schema: TableFieldSuggestSlugSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableFieldSuggestSlugBodyValidator.parse(request.body);
    const params = TableFieldSuggestSlugParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      name: payload.name,
      tableSlug: params.slug,
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
