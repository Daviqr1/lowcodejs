import type { FastifyReply, FastifyRequest } from 'fastify';
import { Service } from 'fastify-decorators';

import {
  E_JWT_TYPE,
  E_ROLE,
  type IJWTPayload,
  type IUser,
  type Merge,
} from '@application/core/entity.core';
import { Env } from '@start/env';

import type { TokenPair } from './session-contract.service';
import {
  ACCESS_TOKEN_COOKIE,
  ACTIVE_ACCOUNT_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SessionContractService,
} from './session-contract.service';

const ACCOUNT_SESSIONS_COOKIE = 'accountSessions';

// O `maxAge` do @fastify/cookie e em SEGUNDOS — vira o atributo Max-Age do
// Set-Cookie, que o RFC 6265 define em segundos. Multiplicar por 1000 fazia o
// access token valer ~2,7 anos e o refresh ~19 anos no navegador: a sessao
// nunca expirava do lado do cliente e sessoes mortas seguiam ocupando uma das
// vagas de MAX_AUTH_ACCOUNTS.
const ACCESS_MAX_AGE = 60 * 60 * 24; // 24h
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7d

type CookieOptions = {
  path: string;
  secure: boolean;
  sameSite: 'none' | 'lax';
  httpOnly: boolean;
  domain?: string;
};

@Service()
export default class SessionService implements SessionContractService {
  async verifyToken(
    request: FastifyRequest,
    token: string,
  ): Promise<IJWTPayload | null> {
    try {
      return await request.server.jwt.verify<IJWTPayload>(token);
    } catch {
      return null;
    }
  }

  async createTokens(
    user: Merge<
      Pick<IUser, '_id' | 'email' | 'group'>,
      { sessionVersion?: number }
    >,
    response: FastifyReply,
  ): Promise<TokenPair> {
    const slug = user?.group?.slug?.toUpperCase();
    const role =
      Object.values(E_ROLE).find((item) => item === slug) ?? E_ROLE.REGISTERED;

    const sub = user._id.toString();

    const jwt: IJWTPayload = {
      sub,
      email: user.email,
      role,
      type: E_JWT_TYPE.ACCESS,
      sessionVersion: user.sessionVersion ?? 0,
    };

    const accessToken = await response.jwtSign(jwt, { sub, expiresIn: '24h' });
    const refreshToken = await response.jwtSign(
      {
        sub,
        type: E_JWT_TYPE.REFRESH,
        // Sem a geracao aqui, um refresh antigo trocaria por um access novo e
        // contornaria a revogacao.
        sessionVersion: user.sessionVersion ?? 0,
      },
      { sub, expiresIn: '7d' },
    );

    return { accessToken, refreshToken };
  }

  extractLastCookieValue(
    cookieHeader: string | undefined,
    name: string,
  ): string | undefined {
    let lastValue: string | undefined;
    for (const [key, value] of this.parseCookieHeader(cookieHeader)) {
      if (key === name) lastValue = value;
    }
    return lastValue;
  }

  getRequestCookie(request: FastifyRequest, name: string): string | undefined {
    return (
      this.extractLastCookieValue(request.headers.cookie, name) ??
      request.cookies[name]
    );
  }

  getActiveAccountId(request: FastifyRequest): string | undefined {
    const value = this.getRequestCookie(request, ACTIVE_ACCOUNT_COOKIE)?.trim();
    if (value) return value;
    return undefined;
  }

  readAccountSessions(request: FastifyRequest): Record<string, string> {
    const raw = this.getRequestCookie(request, ACCOUNT_SESSIONS_COOKIE);
    if (!raw) return {};

    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      if (!parsed || typeof parsed !== 'object') return {};

      const sessions: Record<string, string> = {};
      for (const [accountId, token] of Object.entries(parsed)) {
        if (typeof token === 'string' && token) sessions[accountId] = token;
      }
      return sessions;
    } catch {
      // Cookie corrompido vira mapa vazio em vez de derrubar a request.
      return {};
    }
  }

  listAccountIds(request: FastifyRequest): string[] {
    const accountIds = new Set<string>();

    const activeAccountId = this.getActiveAccountId(request);
    if (activeAccountId) accountIds.add(activeAccountId);

    for (const accountId of Object.keys(this.readAccountSessions(request))) {
      accountIds.add(accountId);
    }

    return Array.from(accountIds);
  }

  setActiveAccountCookie(response: FastifyReply, accountId: string): void {
    response.setCookie(ACTIVE_ACCOUNT_COOKIE, accountId, {
      ...this.cookieOptions(false),
      maxAge: REFRESH_MAX_AGE,
    });
  }

  clearActiveAccountCookie(response: FastifyReply): void {
    response.clearCookie(ACTIVE_ACCOUNT_COOKIE, this.cookieOptions(false));
  }

  writeAccountSessions(
    response: FastifyReply,
    sessions: Record<string, string>,
  ): void {
    if (Object.keys(sessions).length === 0) {
      this.clearAccountSessions(response);
      return;
    }

    response.setCookie(ACCOUNT_SESSIONS_COOKIE, JSON.stringify(sessions), {
      ...this.cookieOptions(),
      maxAge: REFRESH_MAX_AGE,
    });
  }

  clearAccountSessions(response: FastifyReply): void {
    response.clearCookie(ACCOUNT_SESSIONS_COOKIE, this.cookieOptions());
  }

  setCookieTokens(response: FastifyReply, tokens: TokenPair): void {
    const options = this.cookieOptions();

    response
      .setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
        ...options,
        maxAge: ACCESS_MAX_AGE,
      })
      .setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
        ...options,
        maxAge: REFRESH_MAX_AGE,
      });
  }

  clearCookieTokens(response: FastifyReply): void {
    const options = this.cookieOptions();

    response
      .clearCookie(ACCESS_TOKEN_COOKIE, options)
      .clearCookie(REFRESH_TOKEN_COOKIE, options);
  }

  setActiveSession(
    response: FastifyReply,
    accountId: string,
    tokens: TokenPair,
  ): void {
    this.setCookieTokens(response, tokens);
    this.setActiveAccountCookie(response, accountId);
  }

  clearAllSessions(response: FastifyReply): void {
    this.clearCookieTokens(response);
    this.clearActiveAccountCookie(response);
    this.clearAccountSessions(response);
  }

  private cookieOptions(httpOnly = true): CookieOptions {
    const isProduction = Env.NODE_ENV === 'production';
    let sameSite: 'none' | 'lax' = 'lax';
    if (isProduction) sameSite = 'none';

    const options: CookieOptions = {
      path: '/',
      secure: isProduction,
      sameSite,
      httpOnly,
    };
    if (Env.COOKIE_DOMAIN) options.domain = Env.COOKIE_DOMAIN;
    return options;
  }

  private parseCookieHeader(
    cookieHeader: string | undefined,
  ): Array<[string, string]> {
    if (!cookieHeader) return [];

    return cookieHeader.split(';').flatMap((part) => {
      const [key, ...rest] = part.trim().split('=');
      if (!key) return [];
      return [[key, rest.join('=')]];
    });
  }
}
