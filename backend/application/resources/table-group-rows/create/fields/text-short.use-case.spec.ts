// Spec constrói mocks parciais de entidades do domínio via asserção.
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { E_FIELD_FORMAT } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import BcryptRowPasswordService from '@application/services/row-password/row-password.service';
import {
  makePasswordField,
  makeTextShortWithFormat,
} from '@test/helpers/field-factory.helper';
import { makeTableWithGroup } from '@test/helpers/table-factory.helper';

import GroupRowCreateUseCase from '../create.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: BcryptRowPasswordService;
let sut: GroupRowCreateUseCase;

describe('Group Row Create - TEXT_SHORT', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new BcryptRowPasswordService();

    sut = new GroupRowCreateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
    );
  });

  // ─── ALPHA_NUMERIC ───

  describe('formato ALPHA_NUMERIC', () => {
    it('deve criar item no grupo com valor string valido', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        nome: 'Item 1',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');
      expect(result.value.nome).toBe('Item 1');
    });

    it('deve aceitar valor vazio quando nao required', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        required: false,
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        nome: '',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar quando required e valor ausente', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        required: true,
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
      expect(result.value.errors).toHaveProperty('nome');
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        nome: 12345,
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });
  });

  // ─── INTEGER ───

  describe('formato INTEGER', () => {
    it('deve criar item com valor inteiro valido', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        quantidade: '25',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve aceitar inteiro negativo', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'saldo',
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        saldo: '-42',
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        quantidade: '12.5',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve rejeitar texto nao numerico', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        quantidade: 'abc',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── DECIMAL ───

  describe('formato DECIMAL', () => {
    it('deve criar item com valor decimal valido', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        preco: '19.99',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve aceitar inteiro como decimal', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        preco: '100',
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        preco: 'abc',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── URL ───

  describe('formato URL', () => {
    it('deve criar item com URL valida', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        site: 'https://example.com',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar URL sem protocolo', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        site: 'example.com',
      });

      expect(result.isLeft()).toBe(true);
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        site: 'not-a-url',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── EMAIL ───

  describe('formato EMAIL', () => {
    it('deve criar item com email valido', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        email: 'user@example.com',
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        email: 'not-email',
      });

      expect(result.isLeft()).toBe(true);
    });

    it('deve rejeitar email sem dominio', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        email: 'user@',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── PASSWORD ───

  describe('formato PASSWORD', () => {
    it('deve criar item e hashear a senha com bcrypt', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        senha: 'minha-senha-123',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      // Retorno deve estar mascarado
      expect(result.value.senha).toBe('••••••••');

      // Valor armazenado no repositorio deve ser hash bcrypt
      const storedRow = await rowRepository.findOne({
        table,
        query: { _id: row._id },
      });
      const storedItem = (storedRow!.itens as Record<string, unknown>[])[0];
      const isHashed =
        (storedItem.senha as string).startsWith('$2a$') ||
        (storedItem.senha as string).startsWith('$2b$');
      expect(isHashed).toBe(true);

      const matches = await bcrypt.compare(
        'minha-senha-123',
        storedItem.senha as string,
      );
      expect(matches).toBe(true);
    });

    it('deve mascarar senha no retorno', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        senha: 'test-password',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');
      expect(result.value.senha).toBe('••••••••');
    });

    it('deve aceitar valor vazio quando nao required', async () => {
      const field = makePasswordField({ slug: 'senha', required: false });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [field],
        [],
        { slug: 'pedidos' },
      );

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        senha: '',
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── PHONE ───

  describe('formato PHONE', () => {
    it('deve criar item com telefone valido', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        telefone: '(11) 99999-1234',
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        telefone: '11999991234',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── CNPJ ───

  describe('formato CNPJ', () => {
    it('deve criar item com CNPJ valido', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        cnpj: '12.345.678/0001-90',
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        cnpj: '12345678000190',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── CPF ───

  describe('formato CPF', () => {
    it('deve criar item com CPF valido', async () => {
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        cpf: '123.456.789-01',
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

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        cpf: '12345678901',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── CAMPOS MULTIPLOS ───

  describe('multiplos campos TEXT_SHORT', () => {
    it('deve validar todos os campos simultaneamente', async () => {
      const emailField = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
        required: true,
      });
      const cpfField = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
        required: true,
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [emailField, cpfField],
        [],
        { slug: 'pedidos' },
      );

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        email: 'invalido',
        cpf: '000',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.errors).toHaveProperty('email');
      expect(result.value.errors).toHaveProperty('cpf');
    });

    it('deve aceitar quando todos os campos sao validos', async () => {
      const emailField = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
        required: true,
      });
      const cpfField = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
        required: true,
      });
      const table = await makeTableWithGroup(
        tableRepository,
        'itens',
        [emailField, cpfField],
        [],
        { slug: 'pedidos' },
      );

      const row = await rowRepository.create({
        table,
        data: { itens: [] },
      });

      const result = await sut.execute({
        slug: 'pedidos',
        rowId: row._id,
        groupSlug: 'itens',
        email: 'user@test.com',
        cpf: '123.456.789-01',
      });

      expect(result.isRight()).toBe(true);
    });
  });
});
