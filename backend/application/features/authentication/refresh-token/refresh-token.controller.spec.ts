import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Refresh Token Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /authentication/refresh-token', () => {
    it('deve renovar tokens com sucesso quando ambos os cookies estao presentes', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/authentication/refresh-token')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);

      const responseCookies = Array.from<string>(
        response.headers['set-cookie'],
      );

      expect(responseCookies.some((c) => c.includes('accessToken'))).toBe(true);
      expect(responseCookies.some((c) => c.includes('refreshToken'))).toBe(
        true,
      );
    });

    it('deve renovar tokens enviando apenas o refreshToken (cenario de access token expirado)', async () => {
      const { cookies } = await createAuthenticatedUser();
      const refreshOnly = cookies.filter((c) => c.startsWith('refreshToken'));

      expect(refreshOnly.length).toBeGreaterThan(0);

      const response = await supertest(kernel.server)
        .post('/authentication/refresh-token')
        .set('Cookie', refreshOnly);

      expect(response.statusCode).toBe(200);

      const responseCookies = Array.from<string>(
        response.headers['set-cookie'],
      );

      expect(responseCookies.some((c) => c.includes('accessToken'))).toBe(true);
      expect(responseCookies.some((c) => c.includes('refreshToken'))).toBe(
        true,
      );
    });

    it('deve retornar 401 MISSING_REFRESH_TOKEN quando nenhum cookie e enviado', async () => {
      const response = await supertest(kernel.server).post(
        '/authentication/refresh-token',
      );

      expect(response.statusCode).toBe(401);
      expect(response.body.cause).toBe('MISSING_REFRESH_TOKEN');
    });

    it('deve retornar 401 INVALID_REFRESH_TOKEN quando o cookie refreshToken e invalido', async () => {
      const response = await supertest(kernel.server)
        .post('/authentication/refresh-token')
        .set('Cookie', ['refreshToken=invalid-token-value']);

      expect(response.statusCode).toBe(401);
      expect(response.body.cause).toBe('INVALID_REFRESH_TOKEN');
    });
  });
});
