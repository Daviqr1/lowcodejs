import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

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

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    return response.status(201).send(result.value);
  }
}
