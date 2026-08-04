import { beforeEach, describe, expect, it } from 'vitest';

import type { ITable } from '@application/core/entity.core';
import { E_FIELD_FORMAT } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import BcryptPasswordService from '@application/services/password/password.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import RowOwnershipService from '@application/services/row-ownership/row-ownership.service';
import BcryptRowPasswordService from '@application/services/row-password/row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import TypeGuardService from '@application/services/type-guard/type-guard.service';
import {
  makePasswordField,
  makeTextShortWithFormat,
} from '@test/helpers/field-factory.helper';
import { groupItems, lastItemId } from '@test/helpers/row-data.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowUpdateUseCase from '../update.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: BcryptRowPasswordService;
let sut: GroupRowUpdateUseCase;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function createRowWithGroupItem(
  table: ITable,
  groupSlug: string,
  itemData: Record<string, unknown>,
) {
  const row = await rowRepository.create({
    table,
    data: { [groupSlug]: [] },
  });

  const rowWithItem = await rowRepository.addGroupItem({
    table,
    rowId: row._id,
    groupFieldSlug: groupSlug,
    data: itemData,
  });

  const items = groupItems(rowWithItem, groupSlug);
  const itemId = lastItemId(items);

  return { row, rowWithItem, itemId };
}

describe('Group Row Update - TEXT_SHORT', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new BcryptRowPasswordService(
      new BcryptPasswordService(),
    );

    sut = new GroupRowUpdateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
      new InMemoryRowAccessGuardService(),
      new RowOwnershipService(),
      new RowPayloadValidatorService(new MongooseIdentifierService()),
      new TypeGuardService(),
    );
  });

  // ─── ALPHA_NUMERIC ───

  describe('formato ALPHA_NUMERIC', () => {
    it('deve atualizar item com valor string valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        name: 'Nome',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        nome: 'Original',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        nome: 'Atualizado',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');
      expect(result.value.nome).toBe('Atualizado');
    });

    it('deve rejeitar quando valor nao e string', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        nome: 'Original',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        nome: 12345,
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve permitir update parcial sem campo obrigatorio (skipMissing)', async () => {
      const nomeField = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        required: true,
      });
      const codigoField = makeTextShortWithFormat(
        E_FIELD_FORMAT.ALPHA_NUMERIC,
        {
          slug: 'codigo',
          required: true,
        },
      );
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [nomeField, codigoField],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        nome: 'Original',
        codigo: 'ABC',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        nome: 'Atualizado',
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── INTEGER ───

  describe('formato INTEGER', () => {
    it('deve atualizar item com valor inteiro valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'quantidade',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        quantidade: '10',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        quantidade: '25',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar valor decimal', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'quantidade',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        quantidade: '10',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        quantidade: '12.5',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });
  });

  // ─── DECIMAL ───

  describe('formato DECIMAL', () => {
    it('deve atualizar item com valor decimal valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.DECIMAL, {
        slug: 'preco',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        preco: '10.00',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        preco: '19.99',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar texto nao numerico', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.DECIMAL, {
        slug: 'preco',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        preco: '10.00',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        preco: 'abc',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── URL ───

  describe('formato URL', () => {
    it('deve atualizar item com URL valida', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        site: 'https://old.com',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        site: 'https://example.com',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar URL invalida', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        site: 'https://old.com',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        site: 'not-a-url',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── EMAIL ───

  describe('formato EMAIL', () => {
    it('deve atualizar item com email valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        email: 'old@example.com',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        email: 'new@example.com',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar email invalido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        email: 'old@example.com',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        email: 'not-email',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── PASSWORD ───

  describe('formato PASSWORD', () => {
    it('deve atualizar item e mascarar senha no retorno', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        senha: 'original-pass',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        senha: 'nova-senha-123',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');
      expect(result.value.senha).toBe('••••••••');
    });
  });

  // ─── PHONE ───

  describe('formato PHONE', () => {
    it('deve atualizar item com telefone valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        telefone: '(11) 99999-1234',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        telefone: '(21) 88888-5678',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar telefone invalido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        telefone: '(11) 99999-1234',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        telefone: '11999991234',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── CNPJ ───

  describe('formato CNPJ', () => {
    it('deve atualizar item com CNPJ valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CNPJ, {
        slug: 'cnpj',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        cnpj: '12.345.678/0001-90',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        cnpj: '98.765.432/0001-10',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar CNPJ sem formatacao', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CNPJ, {
        slug: 'cnpj',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        cnpj: '12.345.678/0001-90',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        cnpj: '12345678000190',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── CPF ───

  describe('formato CPF', () => {
    it('deve atualizar item com CPF valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        cpf: '123.456.789-01',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        cpf: '987.654.321-00',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar CPF sem formatacao', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const { row, itemId } = await createRowWithGroupItem(table, 'itens', {
        cpf: '123.456.789-01',
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        itemId,
        cpf: '12345678901',
      });

      expect(result.isLeft()).toBe(true);
    });
  });
});
