import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { GroupFieldCreateSchema } from './create.schema';
import GroupFieldCreateUseCase from './create.use-case';
import {
  GroupFieldCreateBodyValidator,
  GroupFieldCreateParamsValidator,
} from './create.validator';

@Controller({
  route: 'tables',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: GroupFieldCreateUseCase = getInstanceByToken(
      GroupFieldCreateUseCase,
    ),
  ) {}

  @POST({
    url: '/:slug/groups/:groupSlug/fields',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'CREATE_FIELD',
        }),
      ],
      schema: GroupFieldCreateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = GroupFieldCreateBodyValidator.parse(request.body);
    const params = GroupFieldCreateParamsValidator.parse(request.params);
    const result = await this.useCase.execute({
      ...payload,
      tableSlug: params.slug,
      groupSlug: params.groupSlug,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send(result.value);
  }
}
