/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import {
  clearCookieTokens,
  listAuthAccountIds,
  MAX_AUTH_ACCOUNTS,
  setAccountCookieTokens,
} from '@application/utils/cookies.util';
import { createTokens } from '@application/utils/jwt.util';

import { SignInSchema } from './sign-in.schema';
import SignInUseCase from './sign-in.use-case';
import { SignInBodyValidator } from './sign-in.validator';

@Controller({
  route: 'authentication',
})
export default class {
  constructor(
    private readonly useCase: SignInUseCase = getInstanceByToken(SignInUseCase),
  ) {}

  @POST({
    url: '/sign-in',
    options: {
      schema: SignInSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const payload = SignInBodyValidator.parse(request.body);
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

    const tokens = await createTokens(result.value, response);
    const accountId = result.value._id.toString();
    const accountIds = listAuthAccountIds(request);
    const isExistingAccount = accountIds.includes(accountId);

    if (!isExistingAccount && accountIds.length >= MAX_AUTH_ACCOUNTS) {
      return response.status(409).send({
        message: 'Limite de contas simultâneas atingido',
        code: 409,
        cause: 'MULTI_ACCOUNT_LIMIT_REACHED',
      });
    }

    clearCookieTokens(response);
    setAccountCookieTokens(response, accountId, { ...tokens });

    return response.status(200).send();
  }
}
