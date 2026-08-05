import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, PUT } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import HttpResponseService from '@application/services/http-response/http-response.service';

import { ProfileUpdateBodyValidator } from '../_shared.validator';

import { ProfileUpdateSchema } from './update.schema';
import ProfileUpdateUseCase from './update.use-case';

@Controller({
  route: 'profile',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: ProfileUpdateUseCase = getInstanceByToken(
      ProfileUpdateUseCase,
    ),
  ) {}

  @PUT({
    url: '',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: ProfileUpdateSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = ProfileUpdateBodyValidator.parse(request.body);

    const result = await this.useCase.execute({
      ...body,
      _id: request.user.sub,
    });

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(200).send(result.value);
  }
}
