import { beforeEach, describe, expect, it } from 'vitest';

import SettingInMemoryRepository from '@application/repositories/setting/setting-in-memory.repository';
import LlmConfigService from '@application/services/llm/llm-config.service';

import SettingShowUseCase from './show.use-case';

let settingInMemoryRepository: SettingInMemoryRepository;
let sut: SettingShowUseCase;

describe('Setting Show Use Case', () => {
  const kanbanTemplate = {
    _id: 'KANBAN_TEMPLATE',
    name: 'Kanban',
    slug: 'kanban-tarefas',
    description: 'Modelo predefinido de tarefas em Kanban',
  };

  const cardsTemplate = {
    _id: 'CARDS_TEMPLATE',
    name: 'Cards',
    slug: 'cards',
    description: 'Modelo predefinido para Cards',
  };

  const mosaicTemplate = {
    _id: 'MOSAIC_TEMPLATE',
    name: 'Mosaico',
    slug: 'mosaico',
    description: 'Modelo predefinido para Mosaico',
  };

  const documentTemplate = {
    _id: 'DOCUMENT_TEMPLATE',
    name: 'Documento',
    slug: 'documento',
    description: 'Modelo predefinido para documento por índice',
  };

  const forumTemplate = {
    _id: 'FORUM_TEMPLATE',
    name: 'Forum',
    slug: 'chat-forum',
    description: 'Modelo predefinido para canais e mensagens em forum',
  };

  const calendarTemplate = {
    _id: 'CALENDAR_TEMPLATE',
    name: 'Calendario',
    slug: 'calendario',
    description: 'Modelo predefinido para agenda/calendário',
  };

  beforeEach(() => {
    settingInMemoryRepository = new SettingInMemoryRepository();
    sut = new SettingShowUseCase(
      settingInMemoryRepository,
      new LlmConfigService(),
    );
  });

  it('deve retornar configurações do banco quando existem', async () => {
    await settingInMemoryRepository.update({
      LOCALE: 'en-us',
      FILE_UPLOAD_MAX_SIZE: 5242880,
      FILE_UPLOAD_ACCEPTED: 'jpg;png',
      MODEL_CLONE_TABLES: ['table1', 'table2'],
    });

    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.LOCALE).toBe('en-us');
    expect(result.value.FILE_UPLOAD_ACCEPTED).toEqual(['jpg', 'png']);
    expect(result.value.MODEL_CLONE_TABLES).toEqual([
      kanbanTemplate,
      cardsTemplate,
      mosaicTemplate,
      documentTemplate,
      forumTemplate,
      calendarTemplate,
      'table1',
      'table2',
    ]);
  });

  it('deve retornar defaults explicitos quando nao ha configuracoes no banco', async () => {
    const result = await sut.execute();

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');

    expect(result.value.SYSTEM_NAME).toBe('LowCodeJs');
    expect(result.value.LOCALE).toBe('pt-br');
    expect(result.value.FILE_UPLOAD_MAX_SIZE).toBe(10485760);
    expect(result.value.FILE_UPLOAD_ACCEPTED).toEqual([
      'jpg',
      'jpeg',
      'png',
      'pdf',
    ]);
    expect(result.value.PAGINATION_PER_PAGE).toBe(20);
    expect(result.value.LOGO_SMALL_URL).toBeNull();
    expect(result.value.LOGO_LARGE_URL).toBeNull();
    expect(result.value.OPENAI_API_KEY).toBeNull();
    expect(result.value.AI_ASSISTANT_ENABLED).toBe(false);
    expect(result.value.EMAIL_PROVIDER_HOST).toBeNull();
    expect(result.value.MODEL_CLONE_TABLES).toEqual([
      kanbanTemplate,
      cardsTemplate,
      mosaicTemplate,
      documentTemplate,
      forumTemplate,
      calendarTemplate,
    ]);
  });

  it('deve retornar erro SETTINGS_READ_ERROR quando houver falha', async () => {
    settingInMemoryRepository.simulateError('get', new Error('Database error'));

    const result = await sut.execute();

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');

    expect(result.value.code).toBe(500);
    expect(result.value.cause).toBe('SETTINGS_READ_ERROR');
    expect(result.value.message).toBe('Erro ao buscar configurações');
  });
});
