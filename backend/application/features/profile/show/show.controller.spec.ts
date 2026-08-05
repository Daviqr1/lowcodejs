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

describe('E2E Profile Show Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /profile', () => {
    it('deve retornar perfil do usuario autenticado', async () => {
      const { cookies, user } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .get('/profile')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.email).toBe(user.email);
      expect(response.body.name).toBe(user.name);
    });

    it('deve retornar o perfil da conta ativa apos alternar contas', async () => {
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

      // After two sign-ins, activeAccountId points to second account
      const cookiesTwoAccounts = mergeSetCookies([
        firstSignIn.headers['set-cookie'],
        secondSignIn.headers['set-cookie'],
      ]);

      const secondProfile = await supertest(kernel.server)
        .get('/profile')
        .set('Cookie', cookiesTwoAccounts);

      expect(secondProfile.statusCode).toBe(200);
      expect(secondProfile.body.email).toBe(second.user.email);

      const switchResponse = await supertest(kernel.server)
        .post('/authentication/switch-account')
        .set('Cookie', cookiesTwoAccounts)
        .send({ accountId: first.user._id });

      expect(switchResponse.statusCode).toBe(200);
      expect(switchResponse.body.activeAccountId).toBe(first.user._id);

      // After switch, activeAccountId is updated to first account
      const cookiesAfterSwitch = mergeSetCookies([
        firstSignIn.headers['set-cookie'],
        secondSignIn.headers['set-cookie'],
        switchResponse.headers['set-cookie'],
      ]);

      const firstProfile = await supertest(kernel.server)
        .get('/profile')
        .set('Cookie', cookiesAfterSwitch);

      expect(firstProfile.statusCode).toBe(200);
      expect(firstProfile.body.email).toBe(first.user.email);
    });
  });
});
