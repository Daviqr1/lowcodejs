import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { Storage } from '@application/model/storage.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

describe('E2E Storage Delete Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Storage.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('DELETE /storage/:_id', () => {
    it('deve deletar arquivo com sucesso', async () => {
      const { cookies } = await createAuthenticatedUser();

      const storage = await Storage.create({
        url: '/uploads/test.txt',
        filename: 'test.txt',
        mimetype: 'text/plain',
        size: 100,
        originalName: 'test.txt',
      });

      const response = await supertest(kernel.server)
        .delete(`/storage/${storage._id}`)
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Arquivo deletado com sucesso');
    });
  });
});
