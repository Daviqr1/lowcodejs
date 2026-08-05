import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { Storage } from '@application/model/storage.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Storage Upload Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Storage.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /storage', () => {
    it('deve fazer upload de arquivo com sucesso', async () => {
      const { cookies } = await createAuthenticatedUser();

      // Create a simple text file buffer for testing
      const testBuffer = Buffer.from('Test file content');

      const response = await supertest(kernel.server)
        .post('/storage')
        .set('Cookie', cookies)
        .attach('file', testBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toBeInstanceOf(Array);

      if (response.body.length > 0) {
        expect(response.body[0].filename).toBeDefined();
        expect(response.body[0].url).toBeDefined();
      }
    });
  });
});
