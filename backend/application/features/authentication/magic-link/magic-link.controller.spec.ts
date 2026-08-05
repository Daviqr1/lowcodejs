import bcrypt from 'bcryptjs';
import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_TOKEN_STATUS, E_USER_STATUS } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { ValidationToken } from '@application/model/validation-token.model';
import { kernel } from '@start/kernel';

describe('E2E Magic Link Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await ValidationToken.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('GET /authentication/magic-link', () => {
    it('deve autenticar via magic link com sucesso', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);

      const group = await UserGroup.create({
        name: 'Owner',
        slug: 'owner',
        permissions: [],
      });

      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        status: E_USER_STATUS.ACTIVE,
        group: group._id,
      });

      await ValidationToken.create({
        code: 'magic-code-123',
        status: E_TOKEN_STATUS.REQUESTED,
        user: user._id,
      });

      const response = await supertest(kernel.server)
        .get('/authentication/magic-link')
        .query({ code: 'magic-code-123' });

      expect(response.statusCode).toBe(302);
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });
});
