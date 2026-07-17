import { beforeEach, describe, expect, it } from 'vitest';

import type {
  IField,
  IGroup,
  IPermission,
} from '@application/core/entity.core';
import {
  E_FIELD_TYPE,
  E_PERMISSION_TARGET,
  E_ROLE,
  E_TABLE_PERMISSION,
} from '@application/core/entity.core';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import UserGroupInMemoryRepository from '@application/repositories/user-group/user-group-in-memory.repository';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';

import FieldVisibilityService from './field-visibility.service';

function makeField(overrides: Partial<IField>): IField {
  const base: IField = {
    _id: 'field-id',
    name: 'Campo',
    slug: 'campo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: null,
    widthInForm: 50,
    widthInList: 10,
    widthInDetail: 50,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    native: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };

  return { ...base, ...overrides };
}

function makePermission(slug: string): IPermission {
  return {
    _id: slug,
    name: slug,
    slug,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

// Empurra um grupo completo no repo in-memory (o create do in-memory perde o
// slug das permissões; aqui precisamos das permissões com slug para a interseção).
function makeGroup(id: string, permissionSlugs: Array<string>): IGroup {
  return {
    _id: id,
    name: id,
    slug: id,
    description: null,
    permissions: permissionSlugs.map(makePermission),
    encompasses: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

let userRepository: UserInMemoryRepository;
let groupRepository: UserGroupInMemoryRepository;
let groupResolver: GroupResolverService;
let sut: FieldVisibilityService;

describe('Field Visibility Service', () => {
  beforeEach(() => {
    userRepository = new UserInMemoryRepository();
    groupRepository = new UserGroupInMemoryRepository();
    groupResolver = new GroupResolverService(groupRepository);
    sut = new FieldVisibilityService(userRepository, groupResolver);
  });

  it('binding PUBLIC mantém o campo visível', async () => {
    const fields = [
      makeField({
        slug: 'nome',
        permissions: {
          list: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
          form: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
          detail: { kind: E_PERMISSION_TARGET.PUBLIC, group: null },
        },
      }),
    ];

    const hidden = await sut.hiddenSlugs({ fields, context: 'list' });

    expect(hidden.has('nome')).toBe(false);
  });

  it('binding NOBODY oculta o campo', async () => {
    const fields = [
      makeField({
        slug: 'segredo',
        permissions: {
          list: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          form: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          detail: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
        },
      }),
    ];

    const hidden = await sut.hiddenSlugs({ fields, context: 'list' });

    expect(hidden.has('segredo')).toBe(true);
  });

  it('binding GROUP (interseção): visível para membro com VIEW_FIELD; oculto sem a capacidade e para os demais', async () => {
    // Grupo com a capacidade global VIEW_FIELD.
    groupRepository.items.push(
      makeGroup('vendas', [E_TABLE_PERMISSION.VIEW_FIELD]),
    );
    // Grupo SEM a capacidade (mesmo binding, mas falta a permissão global).
    groupRepository.items.push(makeGroup('vendas-sem-cap', []));

    const member = await userRepository.create({
      name: 'Membro',
      email: 'membro@x.com',
      password: 'x',
      group: 'vendas',
    });

    const memberSemCap = await userRepository.create({
      name: 'Sem Capacidade',
      email: 'semcap@x.com',
      password: 'x',
      group: 'vendas-sem-cap',
    });

    const outsider = await userRepository.create({
      name: 'Outro',
      email: 'outro@x.com',
      password: 'x',
      group: 'grupo-sem-relacao',
    });

    const fields = [
      makeField({
        slug: 'salario',
        permissions: {
          list: { kind: E_PERMISSION_TARGET.GROUP, group: 'vendas' },
          form: { kind: E_PERMISSION_TARGET.GROUP, group: 'vendas' },
          detail: { kind: E_PERMISSION_TARGET.GROUP, group: 'vendas' },
        },
      }),
    ];

    const hiddenForMember = await sut.hiddenSlugs({
      fields,
      context: 'list',
      userId: member._id,
    });
    expect(hiddenForMember.has('salario')).toBe(false);

    // Interseção: pertence ao grupo do binding? Não (binding aponta 'vendas'),
    // e ainda que apontasse, faltaria a capacidade — oculto.
    const hiddenForSemCap = await sut.hiddenSlugs({
      fields,
      context: 'list',
      userId: memberSemCap._id,
    });
    expect(hiddenForSemCap.has('salario')).toBe(true);

    const hiddenForOutsider = await sut.hiddenSlugs({
      fields,
      context: 'list',
      userId: outsider._id,
    });
    expect(hiddenForOutsider.has('salario')).toBe(true);
  });

  it('binding GROUP: membro do grupo do binding mas SEM VIEW_FIELD fica oculto (interseção)', async () => {
    // O binding aponta para o próprio grupo do usuário, mas o grupo não tem a
    // capacidade VIEW_FIELD — a interseção nega.
    groupRepository.items.push(makeGroup('rh', []));

    const member = await userRepository.create({
      name: 'RH',
      email: 'rh@x.com',
      password: 'x',
      group: 'rh',
    });

    const fields = [
      makeField({
        slug: 'salario',
        permissions: {
          list: { kind: E_PERMISSION_TARGET.GROUP, group: 'rh' },
          form: { kind: E_PERMISSION_TARGET.GROUP, group: 'rh' },
          detail: { kind: E_PERMISSION_TARGET.GROUP, group: 'rh' },
        },
      }),
    ];

    const hidden = await sut.hiddenSlugs({
      fields,
      context: 'list',
      userId: member._id,
    });
    expect(hidden.has('salario')).toBe(true);
  });

  it('campo sem binding (permissions null) permanece visível', async () => {
    const fields = [makeField({ slug: 'visivel', permissions: null })];

    const hidden = await sut.hiddenSlugs({ fields, context: 'list' });

    expect(hidden.has('visivel')).toBe(false);
  });

  it('campo nativo nunca é ocultado, mesmo com binding NOBODY', async () => {
    const fields = [
      makeField({
        slug: '_id',
        native: true,
        permissions: {
          list: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          form: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          detail: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
        },
      }),
    ];

    const hidden = await sut.hiddenSlugs({ fields, context: 'list' });

    expect(hidden.has('_id')).toBe(false);
  });

  it('usuário privilegiado (MASTER pelo fecho de grupos) não tem nenhum campo oculto', async () => {
    const master = await groupRepository.create({
      name: 'Master',
      slug: E_ROLE.MASTER,
      permissions: [],
    });
    const user = await userRepository.create({
      name: 'Master User',
      email: 'master@x.com',
      password: 'x',
      group: master._id,
    });

    const fields = [
      makeField({
        slug: 'segredo',
        permissions: {
          list: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          form: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          detail: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
        },
      }),
    ];

    const hidden = await sut.hiddenSlugs({
      fields,
      context: 'list',
      userId: user._id,
    });

    expect(hidden.size).toBe(0);
  });

  it('dono da tabela (isOwner) enxerga todos os campos', async () => {
    const fields = [
      makeField({
        slug: 'segredo',
        permissions: {
          list: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          form: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
          detail: { kind: E_PERMISSION_TARGET.NOBODY, group: null },
        },
      }),
    ];

    const hidden = await sut.hiddenSlugs({
      fields,
      context: 'detail',
      isOwner: true,
    });

    expect(hidden.size).toBe(0);
  });

  it('project remove apenas as chaves ocultas do objeto', () => {
    const row = { _id: '1', nome: 'Ana', salario: 5000 };

    const result = sut.project(row, new Set(['salario']));

    expect(result).toEqual({ _id: '1', nome: 'Ana' });
    expect('salario' in result).toBe(false);
  });
});
