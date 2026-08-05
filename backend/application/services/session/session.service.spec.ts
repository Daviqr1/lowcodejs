import type { FastifyReply } from 'fastify';
import { describe, expect, it } from 'vitest';

import SessionService from './session.service';

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;

type CapturedCookie = { name: string; value: string; maxAge?: number };

function makeReply(): { reply: FastifyReply; cookies: Array<CapturedCookie> } {
  const cookies: Array<CapturedCookie> = [];

  // Mock parcial: o service so usa setCookie/clearCookie e o encadeamento.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const reply = {
    setCookie(name: string, value: string, options?: { maxAge?: number }) {
      cookies.push({ name, value, maxAge: options?.maxAge });
      return reply;
    },
    clearCookie() {
      return reply;
    },
  } as unknown as FastifyReply;

  return { reply, cookies };
}

describe('SessionService — maxAge dos cookies', () => {
  // O `maxAge` do @fastify/cookie e em SEGUNDOS (vira o Max-Age do Set-Cookie,
  // que o RFC 6265 define em segundos). O codigo multiplicava por 1000, o que
  // dava ~2,7 anos de access token e ~19 anos de refresh: a sessao nunca
  // expirava no navegador e sessoes mortas seguiam ocupando uma das vagas de
  // MAX_AUTH_ACCOUNTS.
  it('expira o access token em 24h e o refresh em 7 dias', () => {
    const service = new SessionService();
    const { reply, cookies } = makeReply();

    service.setCookieTokens(reply, {
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const access = cookies.find((cookie) => cookie.name === 'accessToken');
    const refresh = cookies.find((cookie) => cookie.name === 'refreshToken');

    expect(access?.maxAge).toBe(ONE_DAY_IN_SECONDS);
    expect(refresh?.maxAge).toBe(SEVEN_DAYS_IN_SECONDS);
  });

  it('expira o cookie de conta ativa em 7 dias', () => {
    const service = new SessionService();
    const { reply, cookies } = makeReply();

    service.setActiveAccountCookie(reply, 'account-id');

    const active = cookies.find((cookie) => cookie.name === 'activeAccountId');

    expect(active?.maxAge).toBe(SEVEN_DAYS_IN_SECONDS);
  });

  it('mantem todo maxAge dentro do limite de um ano', () => {
    const service = new SessionService();
    const { reply, cookies } = makeReply();

    service.setCookieTokens(reply, {
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    service.setActiveAccountCookie(reply, 'account-id');
    service.writeAccountSessions(reply, { 'account-id': 'refresh' });

    const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

    for (const cookie of cookies) {
      expect(cookie.maxAge).toBeLessThanOrEqual(ONE_YEAR_IN_SECONDS);
    }
  });
});
