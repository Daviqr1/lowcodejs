import bcrypt from 'bcryptjs';
import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { E_USER_STATUS } from '@application/core/entity.core';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { ValidationToken } from '@application/model/validation-token.model';
import { kernel } from '@start/kernel';

describe('E2E Request Code Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await ValidationToken.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /authentication/recovery/request-code', () => {
    it('deve solicitar codigo de recuperacao com sucesso', async () => {
      const hashedPassword = await bcrypt.hash('senha123', 10);

      const group = await UserGroup.create({
        name: 'Owner',
        slug: 'owner',
        permissions: [],
      });

      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
        status: E_USER_STATUS.ACTIVE,
        group: group._id,
      });

      const response = await supertest(kernel.server)
        .post('/authentication/recovery/request-code')
        .send({
          email: 'test@example.com',
        });

      expect(response.statusCode).toBe(200);
    });
  });
});
