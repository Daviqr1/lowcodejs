import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { RelationshipLinkSchema } from './link.schema';
import RelationshipLinkUseCase from './link.use-case';
import {
  RelationshipLinkBodyValidator,
  RelationshipLinkParamsValidator,
} from './link.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: RelationshipLinkUseCase = getInstanceByToken(
      RelationshipLinkUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/relationships/:id/links',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({ requiredPermission: 'CREATE_ROW' }),
      ],
      schema: RelationshipLinkSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = RelationshipLinkParamsValidator.parse(request.params);
    const body = RelationshipLinkBodyValidator.parse(request.body);

    const result = await this.useCase.execute({ ...params, ...body });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
