import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { TableFieldAddCategorySchema } from './add-category.schema';
import TableFieldAddCategoryUseCase from './add-category.use-case';
import {
  TableFieldAddCategoryBodyValidator,
  TableFieldAddCategoryParamsValidator,
} from './add-category.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: TableFieldAddCategoryUseCase = getInstanceByToken(
      TableFieldAddCategoryUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/fields/:_id/category',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_FIELD',
        }),
      ],
      schema: TableFieldAddCategorySchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = TableFieldAddCategoryBodyValidator.parse(request.body);
    const params = TableFieldAddCategoryParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...payload,
      ...params,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
