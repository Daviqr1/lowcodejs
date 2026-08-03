import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PATCH } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import { GroupRowAutoSaveSchema } from './auto-save.schema';
import GroupRowAutoSaveUseCase from './auto-save.use-case';
import {
  GroupRowAutoSaveBodyValidator,
  GroupRowAutoSaveParamsValidator,
  GroupRowAutoSaveQueryValidator,
} from './auto-save.validator';

@Controller({
  route: 'tables',
})
export default class {
  constructor(
    private readonly useCase: GroupRowAutoSaveUseCase = getInstanceByToken(
      GroupRowAutoSaveUseCase,
    ),
  ) {}

  @PATCH({
    url: '/:slug/rows/:rowId/groups/:groupSlug/auto-save',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        TableAccessMiddleware({
          requiredPermission: 'UPDATE_ROW',
        }),
      ],
      schema: GroupRowAutoSaveSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const params = GroupRowAutoSaveParamsValidator.parse(request.params);
    const payload = GroupRowAutoSaveBodyValidator.parse(request.body);
    const query = GroupRowAutoSaveQueryValidator.parse(request.query);

    const result = await this.useCase.execute({
      ...payload,
      ...params,
      ...query,
      ...(request?.user?.sub && { creator: request.user.sub }),
      __actorUserId: request.user?.sub,
      __ownOnly: request.ownership?.ownOnly,
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
