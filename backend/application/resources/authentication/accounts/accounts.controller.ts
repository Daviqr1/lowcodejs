/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, getInstanceByToken } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import ProfileShowUseCase from '@application/resources/profile/show/show.use-case';
import { toUserResponse } from '@application/resources/users/users.mapper';
import {
  clearAccountCookieTokens,
  clearActiveAccountCookie,
  getIndexedToken,
  listAuthAccountIds,
  resolveAuthAccountId,
  setActiveAccountCookie,
} from '@application/utils/cookies.util';

import { AuthenticationAccountsSchema } from './accounts.schema';

@Controller({
  route: 'authentication',
})
export default class {
  constructor(
    private readonly profileUseCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
    ),
  ) {}

  @GET({
    url: '/accounts',
    options: {
      schema: AuthenticationAccountsSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const accountIds = listAuthAccountIds(request);
    const accounts = [];

    for (const accountId of accountIds) {
      const refreshToken = getIndexedToken(request, 'refresh', accountId);

      if (!refreshToken) {
        clearAccountCookieTokens(response, accountId);
        continue;
      }

      const refreshTokenDecoded: IJWTPayload | null =
        await request.server.jwt.decode(refreshToken);

      if (
        !refreshTokenDecoded ||
        refreshTokenDecoded.type !== E_JWT_TYPE.REFRESH ||
        refreshTokenDecoded.sub !== accountId
      ) {
        clearAccountCookieTokens(response, accountId);
        continue;
      }

      const result = await this.profileUseCase.execute({ _id: accountId });

      if (result.isLeft()) {
        clearAccountCookieTokens(response, accountId);
        continue;
      }

      accounts.push(toUserResponse(result.value));
    }

    const requestedActiveAccountId = resolveAuthAccountId(request);
    const activeAccountId = accounts.some(
      (account) => account._id.toString() === requestedActiveAccountId,
    )
      ? requestedActiveAccountId
      : accounts[0]?._id.toString();

    if (activeAccountId) {
      setActiveAccountCookie(response, activeAccountId);
    } else {
      clearActiveAccountCookie(response);
    }

    return response.status(200).send({
      activeAccountId: activeAccountId ?? null,
      accounts,
    });
  }
}
