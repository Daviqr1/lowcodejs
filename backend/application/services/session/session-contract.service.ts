import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IJWTPayload, IUser } from '@application/core/entity.core';

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

/** Maximo de contas simultaneas por navegador. */
export const MAX_AUTH_ACCOUNTS = 2;

// Nomes de cookie. Ficam exportados como const porque sao lidos tambem fora do
// container (kernel, sockets) e em escopo de modulo.
export const ACTIVE_ACCOUNT_COOKIE = 'activeAccountId';
export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

/**
 * Sessao do usuario: emissao e verificacao de token, e os cookies que carregam
 * a sessao ativa e as inativas (multi-conta). Junta o que estava separado em
 * `utils/jwt.util.ts` e `utils/cookies.util.ts` — sao o mesmo assunto e sempre
 * foram usados juntos.
 */
export abstract class SessionContractService {
  /**
   * Confere assinatura RS256 e expiracao. `jwt.decode` apenas desserializa e
   * aceitaria um token forjado — nunca usar para autorizar.
   *
   * Devolve `null` em vez de lancar porque os chamadores tratam token ausente e
   * token invalido pelo mesmo caminho de 401.
   */
  abstract verifyToken(
    request: FastifyRequest,
    token: string,
  ): Promise<IJWTPayload | null>;

  /** Emite o par access (24h) + refresh (7d). */
  abstract createTokens(
    user: Pick<IUser, '_id' | 'email' | 'group'>,
    response: FastifyReply,
  ): Promise<TokenPair>;

  /** Ultimo valor do cookie no header — o navegador pode mandar repetido. */
  abstract extractLastCookieValue(
    cookieHeader: string | undefined,
    name: string,
  ): string | undefined;

  abstract getRequestCookie(
    request: FastifyRequest,
    name: string,
  ): string | undefined;

  /** Id da conta ativa, ou `undefined` para cair no `sub` do token. */
  abstract getActiveAccountId(request: FastifyRequest): string | undefined;

  /** Sessoes inativas: mapa `accountId -> refreshToken`. Parse defensivo. */
  abstract readAccountSessions(request: FastifyRequest): Record<string, string>;

  /** Ids de todas as contas conhecidas do navegador (ativa + inativas). */
  abstract listAccountIds(request: FastifyRequest): string[];

  abstract setActiveAccountCookie(
    response: FastifyReply,
    accountId: string,
  ): void;
  abstract clearActiveAccountCookie(response: FastifyReply): void;

  abstract writeAccountSessions(
    response: FastifyReply,
    sessions: Record<string, string>,
  ): void;
  abstract clearAccountSessions(response: FastifyReply): void;

  abstract setCookieTokens(response: FastifyReply, tokens: TokenPair): void;
  abstract clearCookieTokens(response: FastifyReply): void;

  /** Promove uma conta a ativa: grava o par de tokens e marca o id. */
  abstract setActiveSession(
    response: FastifyReply,
    accountId: string,
    tokens: TokenPair,
  ): void;

  abstract clearAllSessions(response: FastifyReply): void;
}
