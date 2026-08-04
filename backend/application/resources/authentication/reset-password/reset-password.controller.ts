import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { ResetPasswordSchema } from './reset-password.schema';
import UpdatePasswordRecoveryUseCase from './reset-password.use-case';
import { ResetPasswordBodyValidator } from './reset-password.validator';

@Controller({
  route: 'authentication',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: UpdatePasswordRecoveryUseCase = getInstanceByToken(
      UpdatePasswordRecoveryUseCase,
    ),
  ) {}

  @PUT({
    url: '/recovery/update-password',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: ResetPasswordSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = ResetPasswordBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...body,
      _id: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
