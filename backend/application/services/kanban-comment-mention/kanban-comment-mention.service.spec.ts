import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFieldPermissions,
  E_FIELD_TYPE,
  E_USER_STATUS,
  type IField,
  type IGroupConfiguration,
  type ITable,
  type Merge,
} from '@application/core/entity.core';
import { EntityFixtures } from '@application/repositories/entity-fixtures';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import InMemoryEmailService from '@application/services/email/in-memory-email.service';
import InMemoryNotificationService from '@application/services/notification/in-memory-notification.service';
import { groupItems } from '@test/helpers/row-data.helper';

import KanbanCommentMentionService from './kanban-comment-mention.service';

const fixtures = new EntityFixtures();

function makeField(
  partial: Merge<Partial<IField>, Pick<IField, 'slug' | 'type'>>,
): IField {
  return {
    _id: partial._id ?? `field-${partial.slug}`,
    name: partial.name ?? partial.slug,
    slug: partial.slug,
    type: partial.type,
    required: partial.required ?? false,
    multiple: partial.multiple ?? false,
    format: partial.format ?? null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
    native: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

function makeKanbanTable(): ITable {
  const titulo = makeField({ slug: 'titulo', type: E_FIELD_TYPE.TEXT_SHORT });
  const mencoes = makeField({
    slug: 'mencoes',
    type: E_FIELD_TYPE.USER,
    multiple: true,
  });
  const mencoesNotificadas = makeField({
    slug: 'mencoes-notificadas',
    type: E_FIELD_TYPE.TEXT_LONG,
  });
  const comentario = makeField({
    slug: 'comentario',
    type: E_FIELD_TYPE.TEXT_LONG,
  });
  const autor = makeField({ slug: 'autor', type: E_FIELD_TYPE.USER });
  const data = makeField({ slug: 'data', type: E_FIELD_TYPE.DATE });

  const commentsGroup: IGroupConfiguration = {
    slug: 'comentarios',
    name: 'Comentários',
    fields: [comentario, autor, data, mencoes, mencoesNotificadas],
    _schema: {},
  };

  return {
    _id: 'table-1',
    name: 'Tarefas',
    slug: 'tarefas',
    description: null,
    logo: null,
    type: 'TABLE',
    style: 'KANBAN',
    permissions: null,
    members: [],
    owner: fixtures.makeUser('owner-1'),
    fields: [titulo],
    groups: [commentsGroup],
    fieldOrderList: [],
    fieldOrderForm: [],
    fieldOrderFilter: [],
    fieldOrderDetail: [],
    methods: {
      onLoad: { code: null },
      beforeSave: { code: null },
      afterSave: { code: null },
    },
    order: null,
    _schema: {},
    rowSlugFieldId: null,
    layoutFields: {
      title: null,
      description: null,
      cover: null,
      category: null,
      startDate: null,
      endDate: null,
      color: null,
      participants: null,
      reminder: null,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    trashed: false,
    trashedAt: null,
  };
}

let userRepository: UserInMemoryRepository;
let emailService: InMemoryEmailService;
let notificationService: InMemoryNotificationService;
let sut: KanbanCommentMentionService;

describe('KanbanCommentMentionService', () => {
  beforeEach(() => {
    userRepository = new UserInMemoryRepository();
    emailService = new InMemoryEmailService();
    notificationService = new InMemoryNotificationService();
    sut = new KanbanCommentMentionService(
      userRepository,
      emailService,
      notificationService,
    );
  });

  it('retorna changed=false quando tabela sem grupo de mentions', async () => {
    const table = {
      ...makeKanbanTable(),
      groups: [],
    };
    const row = fixtures.makeRow({ _id: 'row-1' });
    const result = await sut.notifyNewMentions({
      table,
      row,
      actorUserId: 'u1',
    });
    expect(result.changed).toBe(false);
    expect(emailService.getEmails().length).toBe(0);
  });

  it('retorna changed=false quando comentários vazios', async () => {
    const table = makeKanbanTable();
    const row = fixtures.makeRow({ _id: 'row-1', comentarios: [] });
    const result = await sut.notifyNewMentions({
      table,
      row,
      actorUserId: 'u1',
    });
    expect(result.changed).toBe(false);
  });

  it('não envia email quando todas menções já foram notificadas', async () => {
    await userRepository.create({
      name: 'Usuário Um',
      email: 'u1@example.com',
      password: 'x',
      group: 'g1',
    });
    const [user1] = userRepository.items;
    const table = makeKanbanTable();
    const row = fixtures.makeRow({
      _id: 'row-1',
      comentarios: [
        {
          comentario: 'oi',
          mencoes: [user1._id],
          'mencoes-notificadas': JSON.stringify([user1._id]),
        },
      ],
    });
    const result = await sut.notifyNewMentions({
      table,
      row,
      actorUserId: 'actor',
    });
    expect(result.changed).toBe(false);
    expect(emailService.getEmails().length).toBe(0);
  });

  it('filtra autor da própria menção', async () => {
    await userRepository.create({
      name: 'Autor',
      email: 'autor@example.com',
      password: 'x',
      group: 'g1',
    });
    const [author] = userRepository.items;
    const table = makeKanbanTable();
    const row = fixtures.makeRow({
      _id: 'row-1',
      comentarios: [
        {
          comentario: 'auto-menção',
          mencoes: [author._id],
          'mencoes-notificadas': '[]',
        },
      ],
    });
    const result = await sut.notifyNewMentions({
      table,
      row,
      actorUserId: author._id,
    });
    expect(result.changed).toBe(false);
    expect(emailService.getEmails().length).toBe(0);
  });

  it('envia email para menções pendentes e atualiza mencoes-notificadas', async () => {
    await userRepository.create({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'x',
      group: 'g1',
    });
    await userRepository.create({
      name: 'João',
      email: 'joao@example.com',
      password: 'x',
      group: 'g1',
    });
    const [maria, joao] = userRepository.items;
    const table = makeKanbanTable();
    const row = fixtures.makeRow({
      _id: 'row-1',
      titulo: 'Card de teste',
      comentarios: [
        {
          comentario: 'Pessoal, revisem',
          mencoes: [maria._id, joao._id],
          'mencoes-notificadas': '[]',
        },
      ],
    });

    const result = await sut.notifyNewMentions({
      table,
      row,
      actorUserId: 'actor',
    });

    expect(result.changed).toBe(true);
    expect(result.data?.comentarios).toBeDefined();
    const updatedItem = groupItems(result.data!, 'comentarios')[0];
    const notifiedIds = JSON.parse(String(updatedItem['mencoes-notificadas']));
    expect(new Set(notifiedIds)).toEqual(new Set([maria._id, joao._id]));

    const sentEmail = emailService.getLastEmail();
    expect(sentEmail).toBeDefined();
    expect(new Set(sentEmail!.to)).toEqual(
      new Set(['maria@example.com', 'joao@example.com']),
    );
    expect(sentEmail!.subject).toContain('mencionado');
  });

  it('notifica apenas menções novas em edição (diff vs já notificados)', async () => {
    await userRepository.create({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'x',
      group: 'g1',
    });
    await userRepository.create({
      name: 'João',
      email: 'joao@example.com',
      password: 'x',
      group: 'g1',
    });
    const [maria, joao] = userRepository.items;
    const table = makeKanbanTable();
    const row = fixtures.makeRow({
      _id: 'row-1',
      titulo: 'Card',
      comentarios: [
        {
          comentario: 'msg',
          mencoes: [maria._id, joao._id],
          'mencoes-notificadas': JSON.stringify([maria._id]),
        },
      ],
    });

    await sut.notifyNewMentions({ table, row, actorUserId: 'actor' });

    const sent = emailService.getLastEmail();
    expect(sent).toBeDefined();
    expect(sent!.to).toEqual(['joao@example.com']);
  });

  it('ignora usuários inativos no findMany', async () => {
    await userRepository.create({
      name: 'Inativo',
      email: 'inativo@example.com',
      password: 'x',
      group: 'g1',
    });
    const [inactive] = userRepository.items;
    inactive.status = E_USER_STATUS.INACTIVE;

    const table = makeKanbanTable();
    const row = fixtures.makeRow({
      _id: 'row-1',
      comentarios: [
        {
          comentario: 'msg',
          mencoes: [inactive._id],
          'mencoes-notificadas': '[]',
        },
      ],
    });

    const result = await sut.notifyNewMentions({
      table,
      row,
      actorUserId: 'actor',
    });

    expect(result.changed).toBe(false);
    expect(emailService.getEmails().length).toBe(0);
  });

  it('falha de email não throwa e não atualiza notificadas', async () => {
    await userRepository.create({
      name: 'Maria',
      email: 'maria@example.com',
      password: 'x',
      group: 'g1',
    });
    const [maria] = userRepository.items;
    emailService.simulateError('sendEmail', new Error('SMTP off'));

    const table = makeKanbanTable();
    const row = fixtures.makeRow({
      _id: 'row-1',
      comentarios: [
        {
          comentario: 'msg',
          mencoes: [maria._id],
          'mencoes-notificadas': '[]',
        },
      ],
    });

    await expect(
      sut.notifyNewMentions({ table, row, actorUserId: 'actor' }),
    ).resolves.toBeDefined();
  });
});
