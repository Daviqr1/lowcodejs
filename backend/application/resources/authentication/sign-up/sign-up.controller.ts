import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import HttpResponseService from '@application/services/http-response/http-response.service';

import { SignUpSchema } from './sign-up.schema';
import SignUpUseCase from './sign-up.use-case';
import { SignUpBodyValidator } from './sign-up.validator';

@Controller({
  route: 'authentication',
})
export default class {
  private readonly http = getInstanceByToken(HttpResponseService);

  constructor(
    private readonly useCase: SignUpUseCase = getInstanceByToken(SignUpUseCase),
  ) {}

  @POST({
    url: '/sign-up',
    options: {
      schema: SignUpSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = SignUpBodyValidator.parse(request.body);
    const result = await this.useCase.execute(payload);

    if (result.isLeft()) return this.http.sendError(response, result.value);

    return response.status(201).send();
  }
}
