import type { FastifyReply, FastifyRequest } from 'fastify';

import { Env } from '@start/env';

import type { TokenPair } from './jwt.util';

export const MAX_AUTH_ACCOUNTS = 2;
export const ACTIVE_ACCOUNT_COOKIE = 'activeAccountId';
export const AUTH_ACCOUNT_HEADER = 'x-auth-account-id';

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

const getCookieOptions = (httpOnly = true) => ({
  path: '/',
  secure: Env.NODE_ENV === 'production',
  sameSite:
    Env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  httpOnly,
  ...(Env.COOKIE_DOMAIN && { domain: Env.COOKIE_DOMAIN }),
});

function parseCookieHeader(
  cookieHeader: string | undefined,
): Array<[string, string]> {
  if (!cookieHeader) return [];

  return cookieHeader.split(';').flatMap((part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return [];
    return [[key, rest.join('=')]];
  });
}

export function extractLastCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  let lastValue: string | undefined;
  for (const [key, value] of parseCookieHeader(cookieHeader)) {
    if (key === name) {
      lastValue = value;
    }
  }
  return lastValue;
}

export function getRequestCookie(
  request: FastifyRequest,
  name: string,
): string | undefined {
  return (
    extractLastCookieValue(request.headers.cookie, name) ??
    request.cookies[name]
  );
}

export function getTokenCookieName(
  type: 'access' | 'refresh',
  accountId: string,
): string {
  return `${type === 'access' ? ACCESS_TOKEN_COOKIE : REFRESH_TOKEN_COOKIE}_${accountId}`;
}

export function listAuthAccountIds(request: FastifyRequest): Array<string> {
  const accountIds = new Set<string>();
  const pattern = /^(?:accessToken|refreshToken)_(.+)$/;

  for (const key of Object.keys(request.cookies)) {
    const match = key.match(pattern);
    if (match?.[1]) accountIds.add(match[1]);
  }

  for (const [key] of parseCookieHeader(request.headers.cookie)) {
    const match = key.match(pattern);
    if (match?.[1]) accountIds.add(match[1]);
  }

  return Array.from(accountIds);
}

export function getRequestedAccountId(
  request: FastifyRequest,
): string | undefined {
  const headerValue = request.headers[AUTH_ACCOUNT_HEADER];
  const headerAccountId = Array.isArray(headerValue)
    ? headerValue.at(-1)
    : headerValue;

  return (
    headerAccountId?.trim() ||
    getRequestCookie(request, ACTIVE_ACCOUNT_COOKIE)?.trim() ||
    undefined
  );
}

export function resolveAuthAccountId(
  request: FastifyRequest,
): string | undefined {
  const requestedAccountId = getRequestedAccountId(request);
  if (requestedAccountId) return requestedAccountId;

  const accountIds = listAuthAccountIds(request);
  if (accountIds.length === 1) return accountIds[0];

  return undefined;
}

export function getIndexedToken(
  request: FastifyRequest,
  type: 'access' | 'refresh',
  accountId: string,
): string | undefined {
  return getRequestCookie(request, getTokenCookieName(type, accountId));
}

export function resolveAccessToken(request: FastifyRequest): {
  token?: string;
  accountId?: string;
  legacy: boolean;
} {
  const accountId = resolveAuthAccountId(request);
  if (accountId) {
    return {
      token: getIndexedToken(request, 'access', accountId),
      accountId,
      legacy: false,
    };
  }

  return {
    token: getRequestCookie(request, ACCESS_TOKEN_COOKIE),
    legacy: true,
  };
}

export function resolveRefreshToken(request: FastifyRequest): {
  token?: string;
  accountId?: string;
  legacy: boolean;
} {
  const accountId = resolveAuthAccountId(request);
  if (accountId) {
    return {
      token: getIndexedToken(request, 'refresh', accountId),
      accountId,
      legacy: false,
    };
  }

  return {
    token: getRequestCookie(request, REFRESH_TOKEN_COOKIE),
    legacy: true,
  };
}

export const clearCookieTokens = (response: FastifyReply): void => {
  const cookieOptions = getCookieOptions();

  response
    .clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions)
    .clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
};

export const clearAccountCookieTokens = (
  response: FastifyReply,
  accountId: string,
): void => {
  const cookieOptions = getCookieOptions();

  response
    .clearCookie(getTokenCookieName('access', accountId), cookieOptions)
    .clearCookie(getTokenCookieName('refresh', accountId), cookieOptions);
};

export const clearActiveAccountCookie = (response: FastifyReply): void => {
  response.clearCookie(ACTIVE_ACCOUNT_COOKIE, getCookieOptions(false));
};

export const setActiveAccountCookie = (
  response: FastifyReply,
  accountId: string,
): void => {
  response.setCookie(ACTIVE_ACCOUNT_COOKIE, accountId, {
    ...getCookieOptions(false),
    maxAge: 60 * 60 * 7 * 24 * 1000, // 7d
  });
};

export const setCookieTokens = (
  response: FastifyReply,
  tokens: TokenPair,
): void => {
  const cookieOptions = getCookieOptions();

  response
    .setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 1000, // 24h
    })
    .setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 7 * 24 * 1000, // 7d
    });
};

export const setAccountCookieTokens = (
  response: FastifyReply,
  accountId: string,
  tokens: TokenPair,
): void => {
  const cookieOptions = getCookieOptions();

  response
    .setCookie(getTokenCookieName('access', accountId), tokens.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 1000, // 24h
    })
    .setCookie(getTokenCookieName('refresh', accountId), tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 7 * 24 * 1000, // 7d
    });

  setActiveAccountCookie(response, accountId);
};
