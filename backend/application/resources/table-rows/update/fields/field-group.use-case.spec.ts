import { beforeEach, describe, expect, it } from 'vitest';

import { E_FIELD_FORMAT } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import FieldValidationService from '@application/services/field-validation/field-validation.service';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import InMemoryKanbanCommentMentionService from '@application/services/kanban-comment-mention/in-memory-kanban-comment-mention.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowMemberNotificationService from '@application/services/row-member-notification/in-memory-row-member-notification.service';
import InMemoryRowPasswordService from '@application/services/row-password/in-memory-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import { makeTextShortWithFormat } from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import TableRowUpdateUseCase from '../update.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: InMemoryRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowUpdateUseCase;

describe('Table Row Update - FIELD_GROUP', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new InMemoryRowPasswordService();

    scriptExecutionService = new InMemoryScriptExecutionService();

    sut = new TableRowUpdateUseCase(
      tableRepository,
      rowRepository,
      new UserInMemoryRepository(),
      rowPasswordService,
      scriptExecutionService,
      new InMemoryKanbanCommentMentionService(),
      new InMemoryRowMemberNotificationService(),
      new InMemoryFieldVisibilityService(),
      new FieldValidationService(rowRepository, new UserInMemoryRepository()),
      new InMemoryRowAccessGuardService(),
    );
  });

  it('deve atualizar row com array de objetos validos para o grupo', async () => {
    const nomeField = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
      slug: 'nome',
      name: 'Nome',
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [nomeField],
      [],
      { slug: 'pedidos' },
    );

    const row = await rowRepository.create({
      table,
      data: { itens: [{ nome: 'Item 1' }] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      _id: row._id,
      itens: [{ nome: 'Item Atualizado' }, { nome: 'Item Novo' }],
    });

    expect(result.isRight()).toBe(true);
    if (!result.isRight()) throw new Error('Expected right');
    expect(result.value.itens).toHaveLength(2);
  });

  it('deve rejeitar sub-campo invalido dentro do grupo', async () => {
    const emailField = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
      slug: 'email',
      name: 'Email',
      required: true,
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'contatos',
      [emailField],
      [],
      { slug: 'empresa' },
    );

    const row = await rowRepository.create({
      table,
      data: { contatos: [{ email: 'valido@test.com' }] },
    });

    const result = await sut.execute({
      slug: 'empresa',
      _id: row._id,
      contatos: [{ email: 'invalido' }],
    });

    expect(result.isLeft()).toBe(true);
    if (!result.isLeft()) throw new Error('Expected left');
    expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
  });

  it('deve pular validacao de campo omitido (skipMissing)', async () => {
    const nomeField = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
      slug: 'nome',
      name: 'Nome',
      required: true,
    });
    const table = await makeTableWithGroup(
      tableRepository,
      'itens',
      [nomeField],
      [],
      { slug: 'pedidos' },
    );

    const row = await rowRepository.create({
      table,
      data: { itens: [{ nome: 'Item 1' }] },
    });

    const result = await sut.execute({
      slug: 'pedidos',
      _id: row._id,
    });

    expect(result.isRight()).toBe(true);
  });
});
