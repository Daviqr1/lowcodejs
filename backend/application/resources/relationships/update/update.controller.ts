import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { RelationshipUpdateSchema } from './update.schema';
import RelationshipUpdateUseCase from './update.use-case';
import {
  RelationshipUpdateBodyValidator,
  RelationshipUpdateParamsValidator,
} from './update.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RelationshipUpdateUseCase = getInstanceByToken(
      RelationshipUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '/:slug/relationships/:id',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({ requiredPermission: 'UPDATE_FIELD' }),
      ],
      schema: RelationshipUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipUpdateParamsValidator.parse(request.params);
    const body = RelationshipUpdateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ ...params, ...body });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
