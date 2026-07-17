import type { FastifyReply, FastifyRequest } from 'fastify';

import { Env } from '@start/env';

import type { TokenPair } from './jwt.util';

export const MAX_AUTH_ACCOUNTS = 2;
export const ACTIVE_ACCOUNT_COOKIE = 'activeAccountId';

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
const ACCOUNT_SESSIONS_COOKIE = 'accountSessions';

const ACCESS_MAX_AGE = 60 * 60 * 24 * 1000; // 24h
const REFRESH_MAX_AGE = 60 * 60 * 7 * 24 * 1000; // 7d

const getCookieOptions = (
  httpOnly = true,
): {
  path: string;
  secure: boolean;
  sameSite: 'none' | 'lax';
  httpOnly: boolean;
  domain?: string;
} => {
  const isProduction = Env.NODE_ENV === 'production';
  let sameSite: 'none' | 'lax' = 'lax';
  if (isProduction) sameSite = 'none';

  const options: {
    path: string;
    secure: boolean;
    sameSite: 'none' | 'lax';
    httpOnly: boolean;
    domain?: string;
  } = {
    path: '/',
    secure: isProduction,
    sameSite,
    httpOnly,
  };
  if (Env.COOKIE_DOMAIN) options.domain = Env.COOKIE_DOMAIN;
  return options;
};

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

// Conta ativa: o cookie `activeAccountId` (httpOnly:false, legível por JS no
// front). Quando ausente, quem precisar do id usa o `sub` do token decodificado.
export function getActiveAccountId(
  request: FastifyRequest,
): string | undefined {
  const value = getRequestCookie(request, ACTIVE_ACCOUNT_COOKIE)?.trim();
  if (value) return value;
  return undefined;
}

// Sessões inativas vivem consolidadas num único cookie `accountSessions`
// (JSON httpOnly: { "<accountId>": "<refreshToken>" }). Parse defensivo: valor
// corrompido vira mapa vazio em vez de derrubar a request.
export function readAccountSessions(
  request: FastifyRequest,
): Record<string, string> {
  const raw = getRequestCookie(request, ACCOUNT_SESSIONS_COOKIE);
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
    return {};
  }
}

export function listAccountIds(request: FastifyRequest): Array<string> {
  const accountIds = new Set<string>();

  const activeAccountId = getActiveAccountId(request);
  if (activeAccountId) accountIds.add(activeAccountId);

  for (const accountId of Object.keys(readAccountSessions(request))) {
    accountIds.add(accountId);
  }

  return Array.from(accountIds);
}

export const setActiveAccountCookie = (
  response: FastifyReply,
  accountId: string,
): void => {
  response.setCookie(ACTIVE_ACCOUNT_COOKIE, accountId, {
    ...getCookieOptions(false),
    maxAge: REFRESH_MAX_AGE,
  });
};

export const clearActiveAccountCookie = (response: FastifyReply): void => {
  response.clearCookie(ACTIVE_ACCOUNT_COOKIE, getCookieOptions(false));
};

export const clearAccountSessions = (response: FastifyReply): void => {
  response.clearCookie(ACCOUNT_SESSIONS_COOKIE, getCookieOptions());
};

export const writeAccountSessions = (
  response: FastifyReply,
  sessions: Record<string, string>,
): void => {
  if (Object.keys(sessions).length === 0) {
    clearAccountSessions(response);
    return;
  }

  response.setCookie(ACCOUNT_SESSIONS_COOKIE, JSON.stringify(sessions), {
    ...getCookieOptions(),
    maxAge: REFRESH_MAX_AGE,
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
      maxAge: ACCESS_MAX_AGE,
    })
    .setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_MAX_AGE,
    });
};

export const clearCookieTokens = (response: FastifyReply): void => {
  const cookieOptions = getCookieOptions();

  response
    .clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions)
    .clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
};

// Promove uma conta a ativa: grava o par de tokens nos cookies fixos
// `accessToken`/`refreshToken` e marca `activeAccountId`.
export const setActiveSession = (
  response: FastifyReply,
  accountId: string,
  tokens: TokenPair,
): void => {
  setCookieTokens(response, tokens);
  setActiveAccountCookie(response, accountId);
};

export const clearAllSessions = (response: FastifyReply): void => {
  clearCookieTokens(response);
  clearActiveAccountCookie(response);
  clearAccountSessions(response);
};
