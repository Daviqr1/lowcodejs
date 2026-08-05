import supertest from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { Field } from '@application/model/field.model';
import { Table } from '@application/model/table.model';
import { UserGroup } from '@application/model/user-group.model';
import { User } from '@application/model/user.model';
import { kernel } from '@start/kernel';
import { createAuthenticatedUser } from '@test/helpers/auth.helper';

const SIMPLE_YAML = `tables:
  - name: Clientes
    fields:
      - name: Nome
        type: TEXT_SHORT
        required: true
      - name: Email
        type: TEXT_SHORT
        format: EMAIL
  - name: Pedidos
    fields:
      - name: Titulo
        type: TEXT_SHORT
      - name: Cliente
        type: RELATIONSHIP
        relationship:
          table: clientes
          field: nome
`;

describe('E2E Schema Import Controller', () => {
  beforeEach(async () => {
    await kernel.ready();
    await User.deleteMany({});
    await UserGroup.deleteMany({});
    await Table.deleteMany({});
    await Field.deleteMany({});
  });

  afterAll(async () => {
    await kernel.close();
  });

  describe('POST /tables/schema-import', () => {
    it('deve criar todas as tabelas do schema', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/tables/schema-import')
        .set('Cookie', cookies)
        .send({ yaml: SIMPLE_YAML });

      expect(response.statusCode).toBe(201);
      expect(response.body.created).toHaveLength(2);
      expect(response.body.errors).toHaveLength(0);

      const tables = await Table.find({});
      const slugs = tables.map((t) => t.slug).sort();
      expect(slugs).toEqual(['clientes', 'pedidos']);
    });

    it('deve resolver RELATIONSHIP entre tabelas do mesmo schema', async () => {
      const { cookies } = await createAuthenticatedUser();

      await supertest(kernel.server)
        .post('/tables/schema-import')
        .set('Cookie', cookies)
        .send({ yaml: SIMPLE_YAML })
        .expect(201);

      const clienteField = await Field.findOne({ slug: 'cliente' });
      expect(clienteField).not.toBeNull();
      expect(clienteField?.relationship).toBeDefined();
      expect(clienteField?.relationship?.table?.slug).toBe('clientes');
      expect(clienteField?.relationship?.field?.slug).toBe('nome');
    });

    it('deve retornar 401 sem autenticacao', async () => {
      const response = await supertest(kernel.server)
        .post('/tables/schema-import')
        .send({ yaml: SIMPLE_YAML });

      expect(response.statusCode).toBe(401);
    });

    it('deve retornar 400 quando YAML for malformado', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/tables/schema-import')
        .set('Cookie', cookies)
        .send({ yaml: 'tables: [broken' });

      expect(response.statusCode).toBe(400);
      expect(response.body.cause).toBe('INVALID_YAML');
    });

    it('deve retornar 400 quando estrutura nao casa com o schema', async () => {
      const { cookies } = await createAuthenticatedUser();

      const response = await supertest(kernel.server)
        .post('/tables/schema-import')
        .set('Cookie', cookies)
        .send({
          yaml: `tables:
  - name: T
    fields:
      - name: F
        type: TIPO_QUE_NAO_EXISTE
`,
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.cause).toBe('INVALID_SCHEMA');
    });

    it('deve reportar erro de slug duplicado e criar as demais', async () => {
      const { cookies } = await createAuthenticatedUser();

      // pré-cria uma tabela "Clientes" via endpoint normal
      await supertest(kernel.server)
        .post('/tables')
        .set('Cookie', cookies)
        .send({ name: 'Clientes' })
        .expect(201);

      const response = await supertest(kernel.server)
        .post('/tables/schema-import')
        .set('Cookie', cookies)
        .send({
          yaml: `tables:
  - name: Clientes
    fields:
      - name: Nome
        type: TEXT_SHORT
  - name: Produtos
    fields:
      - name: Titulo
        type: TEXT_SHORT
`,
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.created).toHaveLength(1);
      expect(response.body.created[0].slug).toBe('produtos');
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].name).toBe('Clientes');
    });
  });
});
