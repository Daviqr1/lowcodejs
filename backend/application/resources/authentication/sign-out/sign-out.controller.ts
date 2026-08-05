import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, getInstanceByToken, POST } from 'fastify-decorators';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import ProfileShowUseCase from '@application/resources/profile/show/show.use-case';
import { SessionContractService } from '@application/services/session/session-contract.service';
import SessionService from '@application/services/session/session.service';

import { SignOutBodyValidator } from '../_shared.validator';

import { SignOutSchema } from './sign-out.schema';

const SUCCESS_MESSAGE = 'Logout realizado com sucesso';

@Controller({
  route: 'authentication',
})
export default class {
  constructor(
    private readonly profileUseCase: ProfileShowUseCase = getInstanceByToken(
      ProfileShowUseCase,
    ),
    private readonly session: SessionContractService = getInstanceByToken(
      SessionService,
    ),
  ) {}

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
    const { all } = SignOutBodyValidator.parse(request.body ?? {});
    const sessions = this.session.readAccountSessions(request);
    const sessionIds = Object.keys(sessions);

    if (all || sessionIds.length === 0) {
      this.session.clearAllSessions(response);

      return response.status(200).send({
        message: SUCCESS_MESSAGE,
        activeAccountId: null,
      });
    }

    // Promove a próxima conta inativa válida a ativa (gera novo access token).
    for (const nextAccountId of sessionIds) {
      const refreshToken = sessions[nextAccountId];

      const refreshTokenDecoded: IJWTPayload | null =
        await this.session.verifyToken(request, refreshToken);

      if (
        !refreshTokenDecoded ||
        refreshTokenDecoded.type !== E_JWT_TYPE.REFRESH ||
        refreshTokenDecoded.sub !== nextAccountId
      ) {
        delete sessions[nextAccountId];
        continue;
      }

      const result = await this.profileUseCase.execute({ _id: nextAccountId });

      if (result.isLeft()) {
        delete sessions[nextAccountId];
        continue;
      }

      const tokens = await this.session.createTokens(result.value, response);

      delete sessions[nextAccountId];
      this.session.writeAccountSessions(response, sessions);
      this.session.setActiveSession(response, nextAccountId, { ...tokens });

      return response.status(200).send({
        message: SUCCESS_MESSAGE,
        activeAccountId: nextAccountId,
      });
    }

    // Nenhuma sessão inativa válida restante: encerra tudo.
    this.session.clearAllSessions(response);

    return response.status(200).send({
      message: SUCCESS_MESSAGE,
      activeAccountId: null,
    });
  }
}
