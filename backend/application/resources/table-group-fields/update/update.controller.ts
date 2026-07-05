import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { GroupFieldUpdateSchema } from './update.schema';
import GroupFieldUpdateUseCase from './update.use-case';
import {
  GroupFieldUpdateBodyValidator,
  GroupFieldUpdateParamsValidator,
} from './update.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: GroupFieldUpdateUseCase = getInstanceByToken(
      GroupFieldUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '/:slug/groups/:groupSlug/fields/:fieldId',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_FIELD',
        }),
      ],
      schema: GroupFieldUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = GroupFieldUpdateBodyValidator.parse(request.body);
    const params = GroupFieldUpdateParamsValidator.parse(request.params);

    const result = await this.useCase.execute({
      ...payload,
      tableSlug: params.slug,
      groupSlug: params.groupSlug,
      fieldId: params.fieldId,
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
