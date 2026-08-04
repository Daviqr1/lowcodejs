import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
  type IGroupConfiguration,
  type Merge,
} from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import type { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import InMemoryEmailQueueService from '@application/services/email-queue/in-memory-email-queue.service';
import InMemoryNotificationService from '@application/services/notification/in-memory-notification.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import TypeGuardService from '@application/services/type-guard/type-guard.service';
import { groupItems } from '@test/helpers/row-data.helper';

import ForumMessageUseCase from './forum-message.use-case';

function makeField(
  overrides: Merge<Partial<IField>, Pick<IField, 'name' | 'slug' | 'type'>>,
): IField {
  return {
    _id: crypto.randomUUID(),
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(false, false, false),
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
    defaultValue: null,
    locked: false,
    native: false,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    trashed: false,
    trashedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const GROUP_SLUG = 'grupo-mensagens';

const GROUP_FIELDS: IField[] = [
  makeField({ name: 'ID', slug: 'mensagem-id', type: E_FIELD_TYPE.TEXT_SHORT }),
  makeField({ name: 'Texto', slug: 'texto', type: E_FIELD_TYPE.TEXT_LONG }),
  makeField({ name: 'Autor', slug: 'autor', type: E_FIELD_TYPE.USER }),
  makeField({ name: 'Data', slug: 'data', type: E_FIELD_TYPE.DATE }),
  makeField({ name: 'Anexos', slug: 'anexos', type: E_FIELD_TYPE.FILE }),
  makeField({ name: 'Mencoes', slug: 'mencoes', type: E_FIELD_TYPE.USER }),
  makeField({
    name: 'Resposta',
    slug: 'resposta',
    type: E_FIELD_TYPE.TEXT_SHORT,
  }),
  makeField({
    name: 'Reacoes',
    slug: 'reacoes',
    type: E_FIELD_TYPE.TEXT_LONG,
  }),
];

const GROUP_CONFIG: IGroupConfiguration = {
  slug: GROUP_SLUG,
  name: 'Mensagens',
  fields: GROUP_FIELDS,
  _schema: {},
};

const MESSAGES_FIELD = makeField({
  name: 'Mensagens',
  slug: 'mensagens',
  type: E_FIELD_TYPE.FIELD_GROUP,
  group: { slug: GROUP_SLUG },
});

const FORUM_TABLE_PAYLOAD = {
  name: 'Canal Geral',
  slug: 'canal-geral',
  _schema: {},
  fields: [MESSAGES_FIELD._id],
  owner: 'owner-id',
  style: E_TABLE_STYLE.FORUM,
  fieldOrderList: [],
  fieldOrderForm: [],
  groups: [GROUP_CONFIG],
};

async function createForumTable(
  repo: TableInMemoryRepository,
  overrides?: Record<string, unknown>,
): Promise<import('@application/core/entity.core').ITable> {
  let payload = FORUM_TABLE_PAYLOAD;
  if (overrides) payload = { ...FORUM_TABLE_PAYLOAD, ...overrides };
  const table = await repo.create(payload);
  table.fields = [MESSAGES_FIELD];
  return table;
}

const USER_ID = 'user-123';

let tableInMemoryRepository: TableInMemoryRepository;
let rowInMemoryRepository: RowInMemoryRepository;
let mockUserRepo: UserContractRepository;
let emailQueue: InMemoryEmailQueueService;
let notificationService: InMemoryNotificationService;
let sut: ForumMessageUseCase;

describe('Forum Message Use Case', () => {
  beforeEach(() => {
    tableInMemoryRepository = new TableInMemoryRepository();
    rowInMemoryRepository = new RowInMemoryRepository();
    mockUserRepo = new UserInMemoryRepository();
    emailQueue = new InMemoryEmailQueueService();
    notificationService = new InMemoryNotificationService();
    sut = new ForumMessageUseCase(
      tableInMemoryRepository,
      mockUserRepo,
      emailQueue,
      rowInMemoryRepository,
      notificationService,
      new InMemoryRowAccessGuardService(),
      new TypeGuardService(),
    );
    vi.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────

  it('deve criar mensagem com sucesso', async () => {
    const table = await createForumTable(tableInMemoryRepository);

    const row = await rowInMemoryRepository.create({
      table,
      data: { creator: USER_ID, mensagens: [] },
    });

    const result = await sut.create({
      slug: 'canal-geral',
      _id: row._id,
      text: 'Ola mundo!',
      user: USER_ID,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const updatedRow = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row._id },
    });
    const messages = groupItems(updatedRow ?? {}, 'mensagens');
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBe(1);
    expect(messages[0]['texto']).toBe('Ola mundo!');
    expect(messages[0]['autor']).toEqual([USER_ID]);
  });

  it('deve retornar TABLE_NOT_FOUND quando tabela nao existe', async () => {
    const result = await sut.create({
      slug: 'non-existent',
      _id: 'row-id',
      text: 'Hello',
      user: USER_ID,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('TABLE_NOT_FOUND');
  });

  it('deve retornar FORUM_TABLE_REQUIRED quando tabela nao e FORUM', async () => {
    await createForumTable(tableInMemoryRepository, {
      slug: 'tabela-lista',
      style: E_TABLE_STYLE.LIST,
    });

    const result = await sut.create({
      slug: 'tabela-lista',
      _id: 'row-id',
      text: 'Hello',
      user: USER_ID,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('FORUM_TABLE_REQUIRED');
  });

  it('deve retornar ROW_NOT_FOUND quando registro nao existe', async () => {
    await createForumTable(tableInMemoryRepository);

    const result = await sut.create({
      slug: 'canal-geral',
      _id: 'non-existent-row',
      text: 'Hello',
      user: USER_ID,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(404);
    expect(result.value.cause).toBe('ROW_NOT_FOUND');
  });

  it('deve retornar FORUM_MESSAGE_EMPTY quando mensagem sem conteudo', async () => {
    const table = await createForumTable(tableInMemoryRepository);

    const row = await rowInMemoryRepository.create({
      table,
      data: { creator: USER_ID, mensagens: [] },
    });

    const result = await sut.create({
      slug: 'canal-geral',
      _id: row._id,
      text: '',
      attachments: [],
      user: USER_ID,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(400);
    expect(result.value.cause).toBe('FORUM_MESSAGE_EMPTY');
  });

  it('deve retornar FORUM_MESSAGE_CREATE_ERROR quando repository falha', async () => {
    tableInMemoryRepository.simulateError(
      'findBySlug',
      new Error('Database error'),
    );

    const result = await sut.create({
      slug: 'canal-geral',
      _id: 'row-id',
      text: 'Hello',
      user: USER_ID,
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('FORUM_MESSAGE_CREATE_ERROR');
  });

  // ── update ──────────────────────────────────────────────

  it('deve atualizar mensagem com sucesso', async () => {
    const table = await createForumTable(tableInMemoryRepository);

    const messageId = 'msg-uuid-123';

    const row = await rowInMemoryRepository.create({
      table,
      data: {
        creator: USER_ID,
        mensagens: [
          {
            'mensagem-id': messageId,
            texto: 'Texto original',
            autor: [USER_ID],
            data: new Date().toISOString(),
            anexos: [],
            mencoes: [],
            resposta: null,
            reacoes: '[]',
          },
        ],
      },
    });

    const result = await sut.update({
      slug: 'canal-geral',
      _id: row._id,
      messageId,
      text: 'Texto atualizado',
      user: USER_ID,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const updatedRow = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row._id },
    });
    const messages = groupItems(updatedRow ?? {}, 'mensagens');
    expect(messages[0]['texto']).toBe('Texto atualizado');
  });

  it('deve retornar FORUM_MESSAGE_AUTHOR_REQUIRED quando nao e o autor', async () => {
    const table = await createForumTable(tableInMemoryRepository);

    const messageId = 'msg-uuid-456';
    const authorId = 'author-original';

    const row = await rowInMemoryRepository.create({
      table,
      data: {
        creator: USER_ID,
        mensagens: [
          {
            'mensagem-id': messageId,
            texto: 'Texto original',
            autor: [authorId],
            data: new Date().toISOString(),
            anexos: [],
            mencoes: [],
            resposta: null,
            reacoes: '[]',
          },
        ],
      },
    });

    const result = await sut.update({
      slug: 'canal-geral',
      _id: row._id,
      messageId,
      text: 'Tentativa de editar',
      user: 'another-user',
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(403);
    expect(result.value.cause).toBe('FORUM_MESSAGE_AUTHOR_REQUIRED');
  });

  // ── remove ──────────────────────────────────────────────

  it('deve deletar mensagem com sucesso', async () => {
    const table = await createForumTable(tableInMemoryRepository);

    const messageId = 'msg-uuid-789';

    const row = await rowInMemoryRepository.create({
      table,
      data: {
        creator: USER_ID,
        mensagens: [
          {
            'mensagem-id': messageId,
            texto: 'Mensagem para deletar',
            autor: [USER_ID],
            data: new Date().toISOString(),
            anexos: [],
            mencoes: [],
            resposta: null,
            reacoes: '[]',
          },
        ],
      },
    });

    const result = await sut.remove({
      slug: 'canal-geral',
      _id: row._id,
      messageId,
      user: USER_ID,
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    const updatedRow = await rowInMemoryRepository.findOne({
      table,
      query: { _id: row._id },
    });
    const messages = groupItems(updatedRow ?? {}, 'mensagens');
    expect(messages.length).toBe(0);
  });
});
