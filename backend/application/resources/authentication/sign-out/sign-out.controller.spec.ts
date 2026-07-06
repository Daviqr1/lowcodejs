import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

/**
 * Merges multiple Set-Cookie header arrays (one per response) into a single
 * cookie string usable in a Cookie request header. Later values for the same
 * cookie name override earlier ones, mimicking browser behaviour. Entries
 * whose value is empty (i.e. cleared by Max-Age=0) are excluded from the
 * result, also matching browser behaviour.
 */
function mergeSetCookies(
  setCookieArrays: (string | string[] | undefined)[],
): string {
  const cookieMap = new Map<string, string>();

  for (const setCookies of setCookieArrays) {
    if (!setCookies) continue;
    const headers = [setCookies].flat();
    for (const header of headers) {
      const firstSegment = header.split(';')[0].trim();
      const eqIdx = firstSegment.indexOf('=');
      if (eqIdx === -1) continue;
      const name = firstSegment.slice(0, eqIdx).trim();
      const value = firstSegment.slice(eqIdx + 1).trim();
      if (!name) continue;
      if (value === '') {
        // Empty value means the cookie was cleared — remove from the map
        cookieMap.delete(name);
      } else {
        cookieMap.set(name, value);
      }
    }
  }

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

describe('E2E Sign Out Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /authentication/sign-out', () => {
    it('deve fazer logout com sucesso e limpar cookies', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/authentication/sign-out')
        .set('Cookie', mergeSetCookies([cookies]))
        .send({});

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Logout realizado com sucesso');

      const responseCookies = Array.from<string>(
        response.headers['set-cookie'],
      );
      expect(responseCookies.some((c) => c.includes('accessToken=;'))).toBe(
        true,
      );
      expect(responseCookies.some((c) => c.includes('refreshToken=;'))).toBe(
        true,
      );
      expect(responseCookies.some((c) => c.includes('activeAccountId=;'))).toBe(
        true,
      );
    });

    it('deve remover apenas a conta ativa quando houver outra conta autenticada', async () => {
      const first = await createAuthenticatedUser({
        email: 'first@example.com',
        name: 'First User',
      });
      const second = await createAuthenticatedUser({
        email: 'second@example.com',
        name: 'Second User',
      });

      const firstSignIn = await supertest(kernel.server)
        .post('/authentication/sign-in')
        .send({ email: first.user.email, password: 'password123' });

      const secondSignIn = await supertest(kernel.server)
        .post('/authentication/sign-in')
        .set('Cookie', mergeSetCookies([firstSignIn.headers['set-cookie']]))
        .send({ email: second.user.email, password: 'password123' });

      // Apos dois sign-ins: accessToken/refreshToken (nome fixo) da conta ativa
      // (id2), accountSessions guarda a inativa (id1), activeAccountId=<id2>.
      const cookiesBeforeSignOut = mergeSetCookies([
        firstSignIn.headers['set-cookie'],
        secondSignIn.headers['set-cookie'],
      ]);

      const response = await supertest(kernel.server)
        .post('/authentication/sign-out')
        .set('Cookie', cookiesBeforeSignOut)
        .send({});

      expect(response.statusCode).toBe(200);
      expect(response.body.activeAccountId).toBe(first.user._id);

      // After sign-out: <id2> is cleared, activeAccountId is updated to <id1>
      const cookiesAfterSignOut = mergeSetCookies([
        firstSignIn.headers['set-cookie'],
        secondSignIn.headers['set-cookie'],
        response.headers['set-cookie'],
      ]);

      const profile = await supertest(kernel.server)
        .get('/profile')
        .set('Cookie', cookiesAfterSignOut);

      expect(profile.statusCode).toBe(200);
      expect(profile.body.email).toBe(first.user.email);
    });
  });
});
