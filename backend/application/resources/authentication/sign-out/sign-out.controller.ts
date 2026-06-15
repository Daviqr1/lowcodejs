import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, POST } from 'fastify-decorators';

import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import {
  clearAccountCookieTokens,
  clearActiveAccountCookie,
  clearCookieTokens,
  listAuthAccountIds,
  resolveAuthAccountId,
  setActiveAccountCookie,
} from '@application/utils/cookies.util';

import { SignOutSchema } from './sign-out.schema';

@Controller({
  route: 'authentication',
})
export default class {
  @POST({
    url: '/sign-out',
    options: {
      onRequest: [
        AuthenticationMiddleware({
          optional: false,
        }),
      ],
      schema: SignOutSchema,
    },
  })
  async handle(request: FastifyRequest, response: FastifyReply): Promise<void> {
    const body = request.body as { all?: boolean } | undefined;
    const accountIds = listAuthAccountIds(request);
    const activeAccountId = resolveAuthAccountId(request) ?? request.user.sub;

    if (body?.all || accountIds.length === 0) {
      clearCookieTokens(response);
      for (const accountId of accountIds) {
        clearAccountCookieTokens(response, accountId);
      }
      clearActiveAccountCookie(response);

      return response.status(200).send({
        message: 'Logout realizado com sucesso',
        activeAccountId: null,
      });
    }

    clearAccountCookieTokens(response, activeAccountId);

    const nextAccountId = accountIds.find(
      (accountId) => accountId !== activeAccountId,
    );

    if (nextAccountId) {
      setActiveAccountCookie(response, nextAccountId);
    } else {
      clearActiveAccountCookie(response);
    }

    return response.status(200).send({
      message: 'Logout realizado com sucesso',
      activeAccountId: nextAccountId ?? null,
    });
  }
}
