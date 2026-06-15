/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, POST, getInstanceByToken } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import ProfileShowUseCase from '@application/resources/profile/show/show.use-case';
import {
  getIndexedToken,
  listAuthAccountIds,
  setActiveAccountCookie,
} from '@application/utils/cookies.util';

import { SwitchAccountSchema } from './switch-account.schema';
import { SwitchAccountBodyValidator } from './switch-account.validator';

@Controller({
  route: 'authentication',
})
export default class {
  constructor(
    private readonly profileUseCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
    ),
  ) {}

  @POST({
    url: '/switch-account',
    options: {
      schema: SwitchAccountSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const { accountId } = SwitchAccountBodyValidator.parse(request.body);
    const accountIds = listAuthAccountIds(request);

    if (!accountIds.includes(accountId)) {
      return response.status(401).send({
        message: 'Conta autenticada não encontrada',
        code: 401,
        cause: 'AUTH_ACCOUNT_NOT_FOUND',
      });
    }

    const refreshToken = getIndexedToken(request, 'refresh', accountId);

    if (!refreshToken) {
      return response.status(401).send({
        message: 'Refresh token ausente',
        code: 401,
        cause: 'MISSING_REFRESH_TOKEN',
      });
    }

    const refreshTokenDecoded: IJWTPayload | null =
      await request.server.jwt.decode(refreshToken);

    if (
      !refreshTokenDecoded ||
      refreshTokenDecoded.type !== E_JWT_TYPE.REFRESH ||
      refreshTokenDecoded.sub !== accountId
    ) {
      return response.status(401).send({
        message: 'Refresh token inválido ou expirado',
        code: 401,
        cause: 'INVALID_REFRESH_TOKEN',
      });
    }

    const result = await this.profileUseCase.execute({ _id: accountId });

    if (result.isLeft()) {
      const error = result.value;

      return response.status(error.code).send({
        message: error.message,
        code: error.code,
        cause: error.cause,
        ...(error.errors && { errors: error.errors }),
      });
    }

    setActiveAccountCookie(response, accountId);

    return response.status(200).send({ activeAccountId: accountId });
  }
}
