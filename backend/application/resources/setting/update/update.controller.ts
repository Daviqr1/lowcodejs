import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { E_AREA_CAPABILITY } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { PermissionMiddleware } from '@application/middlewares/permission.middleware';

import { SettingUpdateSchema } from './update.schema';
import SettingUpdateUseCase from './update.use-case';
import { SettingUpdateBodyValidator } from './update.validator';

@Controller({
  route: '/setting',
})
export default class {
  constructor(
    private readonly useCase: SettingUpdateUseCase = getInstanceByToken(
      SettingUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
        PermissionMiddleware(E_AREA_CAPABILITY.MANAGE_SETTINGS),
      ],
      schema: SettingUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = SettingUpdateBodyValidator.parse(request.body);

    const result = await this.useCase.execute(payload);

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
