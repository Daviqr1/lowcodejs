import { beforeEach, describe, expect, it } from 'vitest';

import {
  E_ROLE,
  E_TABLE_STYLE,
  type IGroup,
} from '@application/core/entity.core';
import FieldInMemoryRepository from '@application/repositories/field/field-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';
import InMemoryModelBuilder from '@application/services/table/in-memory-model-builder.service';

import TableUpdateUseCase from './update.use-case';

let tableInMemoryRepository: TableInMemoryRepository;
let fieldInMemoryRepository: FieldInMemoryRepository;
let userInMemoryRepository: UserInMemoryRepository;
let userGroupInMemoryRepository: UserGroupInMemoryRepository;
let groupResolver: GroupResolverService;
let modelBuilder: InMemoryModelBuilder;
let sut: TableUpdateUseCase;

function makeGroup(slug: string): IGroup {
  return {
    _id: 'group-' + slug,
    name: slug,
    slug,
    description: null,
    permissions: [],
    encompasses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

// Cria um ator no repo de usuarios com o grupo informado e devolve o _id.
async function makeActor(groupSlug: string): Promise<string> {
  const actor = await userInMemoryRepository.create({
    name: 'Ator ' + groupSlug,
    email: groupSlug.toLowerCase() + '@x.com',
    password: 'pwd',
    group: 'group-' + groupSlug,
  });
  actor.group = makeGroup(groupSlug);
  return actor._id;
}

describe('Table Update Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    fieldInMemoryRepository = new FieldInMemoryRepository();
    userInMemoryRepository = new UserInMemoryRepository();
    userGroupInMemoryRepository = new UserGroupInMemoryRepository();
    // O fecho de grupos resolve o privilegio a partir do group repo (id->grupo).
    userGroupInMemoryRepository.items.push(
      makeGroup(E_ROLE.MASTER),
      makeGroup(E_ROLE.ADMINISTRATOR),
      makeGroup(E_ROLE.MANAGER),
      makeGroup(E_ROLE.REGISTERED),
    );
    groupResolver = new GroupResolverService(userGroupInMemoryRepository);
    modelBuilder = new InMemoryModelBuilder();

    sut = new TableUpdateUseCase(
      tableInMemoryRepository,
      fieldInMemoryRepository,
      modelBuilder,
      userInMemoryRepository,
      groupResolver,
    );
  });

  it('deve atualizar tabela com sucesso', async () => {
    await tableInMemoryRepository.create({
      name: 'Clientes',
      slug: 'clientes',
      _schema: {},
      fields: [],
      owner: 'owner-id',
      style: E_TABLE_STYLE.LIST,
      fieldOrderList: [],
      fieldOrderForm: [],
      fieldOrderFilter: [],
      fieldOrderDetail: [],
    });

    const result = await sut.execute({
      routeSlug: 'clientes',
      slug: 'clientes-atualizado',
      name: 'Clientes Atualizado',
      description: 'Tabela de clientes',
      logo: 'logo-url',
      methods: {
        afterSave: {
          code: null,
        },
        beforeSave: {
          code: null,
        },
        onLoad: {
          code: null,
        },
      },
      style: E_TABLE_STYLE.GALLERY,
      fieldOrderForm: [],
      fieldOrderList: [],
      fieldOrderFilter: [],
      fieldOrderDetail: [],
      order: null,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.name).toBe('Clientes Atualizado');
    expect(result.value.style).toBe(E_TABLE_STYLE.GALLERY);
  });

  it('deve retornar erro TABLE_NOT_FOUND quando tabela nao existir', async () => {
    const result = await sut.execute({
      routeSlug: 'non-existent',
      slug: 'test',
      name: 'Test',
      description: 'Tabela de clientes',
      logo: 'logo-url',
      methods: {
        afterSave: {
          code: null,
        },
        beforeSave: {
          code: null,
        },
        onLoad: {
          code: null,
        },
      },
      style: E_TABLE_STYLE.GALLERY,
      fieldOrderForm: [],
      fieldOrderList: [],
      fieldOrderFilter: [],
      fieldOrderDetail: [],
      order: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
    expect(result.value.message).toBe('Tabela não encontrada');
  });

  it('deve retornar erro UPDATE_TABLE_ERROR quando houver falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.execute({
      routeSlug: 'some-slug',
      slug: 'test',
      name: 'Test',
      description: 'Tabela de clientes',
      logo: 'logo-url',
      methods: {
        afterSave: {
          code: null,
        },
        beforeSave: {
          code: null,
        },
        onLoad: {
          code: null,
        },
      },
      style: E_TABLE_STYLE.GALLERY,
      fieldOrderForm: [],
      fieldOrderList: [],
      fieldOrderFilter: [],
      fieldOrderDetail: [],
      order: null,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('UPDATE_TABLE_ERROR');
    expect(result.value.message).toBe('Erro interno do servidor');
  });

  describe('troca de dono', () => {
    const baseFields = {
      slug: 'clientes',
      name: 'Clientes',
      description: null,
      logo: null,
      methods: {
        afterSave: { code: null },
        beforeSave: { code: null },
        onLoad: { code: null },
      },
      style: E_TABLE_STYLE.LIST,
      fieldOrderForm: [],
      fieldOrderList: [],
      fieldOrderFilter: [],
      fieldOrderDetail: [],
      order: null,
    };

    beforeEach(async () => {
      await tableInMemoryRepository.create({
        name: 'Clientes',
        slug: 'clientes',
        _schema: {},
        fields: [],
        owner: 'owner-id',
        style: E_TABLE_STYLE.LIST,
        fieldOrderList: [],
        fieldOrderForm: [],
        fieldOrderFilter: [],
        fieldOrderDetail: [],
      });
    });

    it('deve negar troca de dono para quem nao e dono nem privilegiado', async () => {
      const actorId = await makeActor(E_ROLE.REGISTERED);

      const result = await sut.execute({
        routeSlug: 'clientes',
        ...baseFields,
        owner: 'new-owner-id',
        actorId,
        actorIsOwner: false,
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');

      expect(result.value.code).toBe(403);
      expect(result.value.cause).toBe('OWNER_CHANGE_FORBIDDEN');
    });

    it('deve permitir que o dono atual troque o dono', async () => {
      const actorId = await makeActor(E_ROLE.MANAGER);

      const result = await sut.execute({
        routeSlug: 'clientes',
        ...baseFields,
        owner: 'new-owner-id',
        actorId,
        actorIsOwner: true,
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      expect(result.value.owner._id).toBe('new-owner-id');
    });

    it('deve permitir que MASTER troque o dono', async () => {
      const actorId = await makeActor(E_ROLE.MASTER);

      const result = await sut.execute({
        routeSlug: 'clientes',
        ...baseFields,
        owner: 'new-owner-id',
        actorId,
        actorIsOwner: false,
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      expect(result.value.owner._id).toBe('new-owner-id');
    });

    it('deve permitir que ADMINISTRATOR troque o dono', async () => {
      const actorId = await makeActor(E_ROLE.ADMINISTRATOR);

      const result = await sut.execute({
        routeSlug: 'clientes',
        ...baseFields,
        owner: 'new-owner-id',
        actorId,
        actorIsOwner: false,
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      expect(result.value.owner._id).toBe('new-owner-id');
    });

    it('deve permitir privilegiado por grupo adicional/englobado (nao apenas o principal)', async () => {
      // Ator com grupo principal REGISTERED, mas com MASTER em groups[].
      const actor = await userInMemoryRepository.create({
        name: 'Ator misto',
        email: 'misto@x.com',
        password: 'pwd',
        group: 'group-REGISTERED',
      });
      actor.group = makeGroup(E_ROLE.REGISTERED);
      actor.groups = [makeGroup(E_ROLE.MASTER)];

      const result = await sut.execute({
        routeSlug: 'clientes',
        ...baseFields,
        owner: 'new-owner-id',
        actorId: actor._id,
        actorIsOwner: false,
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      expect(result.value.owner._id).toBe('new-owner-id');
    });

    it('nao deve aplicar a trava quando o dono nao muda', async () => {
      const actorId = await makeActor(E_ROLE.REGISTERED);

      const result = await sut.execute({
        routeSlug: 'clientes',
        ...baseFields,
        owner: 'owner-id',
        actorId,
        actorIsOwner: false,
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      expect(result.value.owner._id).toBe('owner-id');
    });
  });
});
