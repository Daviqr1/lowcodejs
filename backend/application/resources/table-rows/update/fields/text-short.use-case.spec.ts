import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { E_FIELD_FORMAT } from '@application/core/entity.core';
import { RowAccessGuardService } from '@application/core/extensions/row-access-guard.service';
import ExtensionInMemoryRepository from '@application/repositories/extension/extension-in-memory.repository';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import InMemoryKanbanCommentMentionService from '@application/services/kanban-comment-mention/in-memory-kanban-comment-mention.service';
import BcryptRowPasswordService from '@application/services/row-password/bcrypt-row-password.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import {
  makePasswordField,
  makeTextShortWithFormat,
} from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowUpdateUseCase from '../update.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let rowPasswordService: BcryptRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowUpdateUseCase;

describe('Table Row Update - TEXT_SHORT', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    rowPasswordService = new BcryptRowPasswordService();

    scriptExecutionService = new InMemoryScriptExecutionService();

    sut = new TableRowUpdateUseCase(
      tableRepository,
      rowRepository,
      rowPasswordService,
      scriptExecutionService,
      new InMemoryKanbanCommentMentionService(),
      new RowAccessGuardService(new ExtensionInMemoryRepository()),
    );
  });

  // ─── ALPHA_NUMERIC ───

  describe('formato ALPHA_NUMERIC', () => {
    it('deve atualizar row com valor string valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        name: 'Nome',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });

      const row = await rowRepository.create({
        table,
        data: { nome: 'Joao Silva' },
      });

      const result = await sut.execute({
        slug: 'clientes',
        _id: row._id,
        nome: 'Maria Santos',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');
      expect(result.value.nome).toBe('Maria Santos');
    });

    it('deve rejeitar quando valor nao e string', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });

      const row = await rowRepository.create({
        table,
        data: { nome: 'Joao' },
      });

      const result = await sut.execute({
        slug: 'clientes',
        _id: row._id,
        nome: 12345,
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        required: true,
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });

      const row = await rowRepository.create({
        table,
        data: { nome: 'Joao' },
      });

      const result = await sut.execute({
        slug: 'clientes',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── INTEGER ───

  describe('formato INTEGER', () => {
    it('deve atualizar row com valor inteiro valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'idade',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });

      const row = await rowRepository.create({
        table,
        data: { idade: '20' },
      });

      const result = await sut.execute({
        slug: 'clientes',
        _id: row._id,
        idade: '25',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar valor decimal', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'idade',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });

      const row = await rowRepository.create({
        table,
        data: { idade: '20' },
      });

      const result = await sut.execute({
        slug: 'clientes',
        _id: row._id,
        idade: '12.5',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'idade',
        required: true,
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });

      const row = await rowRepository.create({
        table,
        data: { idade: '30' },
      });

      const result = await sut.execute({
        slug: 'clientes',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── DECIMAL ───

  describe('formato DECIMAL', () => {
    it('deve atualizar row com valor decimal valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.DECIMAL, {
        slug: 'preco',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'produtos',
      });

      const row = await rowRepository.create({
        table,
        data: { preco: '10.00' },
      });

      const result = await sut.execute({
        slug: 'produtos',
        _id: row._id,
        preco: '19.99',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar texto nao numerico', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.DECIMAL, {
        slug: 'preco',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'produtos',
      });

      const row = await rowRepository.create({
        table,
        data: { preco: '10.00' },
      });

      const result = await sut.execute({
        slug: 'produtos',
        _id: row._id,
        preco: 'abc',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.DECIMAL, {
        slug: 'preco',
        required: true,
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'produtos',
      });

      const row = await rowRepository.create({
        table,
        data: { preco: '50.00' },
      });

      const result = await sut.execute({
        slug: 'produtos',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── URL ───

  describe('formato URL', () => {
    it('deve atualizar row com URL valida', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'empresas',
      });

      const row = await rowRepository.create({
        table,
        data: { site: 'https://old.com' },
      });

      const result = await sut.execute({
        slug: 'empresas',
        _id: row._id,
        site: 'https://example.com',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar URL invalida', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'empresas',
      });

      const row = await rowRepository.create({
        table,
        data: { site: 'https://old.com' },
      });

      const result = await sut.execute({
        slug: 'empresas',
        _id: row._id,
        site: 'not-a-url',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
        required: true,
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'empresas',
      });

      const row = await rowRepository.create({
        table,
        data: { site: 'https://example.com' },
      });

      const result = await sut.execute({
        slug: 'empresas',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── EMAIL ───

  describe('formato EMAIL', () => {
    it('deve atualizar row com email valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'contatos',
      });

      const row = await rowRepository.create({
        table,
        data: { email: 'old@example.com' },
      });

      const result = await sut.execute({
        slug: 'contatos',
        _id: row._id,
        email: 'new@example.com',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar email invalido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'contatos',
      });

      const row = await rowRepository.create({
        table,
        data: { email: 'old@example.com' },
      });

      const result = await sut.execute({
        slug: 'contatos',
        _id: row._id,
        email: 'not-email',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
        required: true,
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'contatos',
      });

      const row = await rowRepository.create({
        table,
        data: { email: 'user@example.com' },
      });

      const result = await sut.execute({
        slug: 'contatos',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── PASSWORD ───

  describe('formato PASSWORD', () => {
    it('deve atualizar row e hashear nova senha com bcrypt', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTable(tableRepository, [field], {
        slug: 'usuarios',
      });

      const row = await rowRepository.create({
        table,
        data: { senha: await bcrypt.hash('senha-antiga', 12) },
      });

      const result = await sut.execute({
        slug: 'usuarios',
        _id: row._id,
        senha: 'nova-senha-123',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      // Valor armazenado deve ser hash bcrypt da nova senha
      const stored = await rowRepository.findOne({
        table,
        query: { _id: row._id },
      });
      expect(stored).toBeDefined();
      const isHashed =
        (stored!.senha as string).startsWith('$2a$') ||
        (stored!.senha as string).startsWith('$2b$');
      expect(isHashed).toBe(true);

      const matches = await bcrypt.compare(
        'nova-senha-123',
        stored!.senha as string,
      );
      expect(matches).toBe(true);
    });

    it('deve mascarar senha no retorno', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTable(tableRepository, [field], {
        slug: 'usuarios',
      });

      const row = await rowRepository.create({
        table,
        data: { senha: await bcrypt.hash('senha-antiga', 12) },
      });

      const result = await sut.execute({
        slug: 'usuarios',
        _id: row._id,
        senha: 'nova-senha',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');
      expect(result.value.senha).toBe('••••••••');
    });

    it('deve ignorar valor mascarado e preservar hash existente', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTable(tableRepository, [field], {
        slug: 'usuarios',
      });

      const originalHash = await bcrypt.hash('senha-original', 12);
      const row = await rowRepository.create({
        table,
        data: { senha: originalHash },
      });

      // Update com mascara - stripMaskedPasswordFields deve remover 'senha' do payload
      const result = await sut.execute({
        slug: 'usuarios',
        _id: row._id,
        senha: '••••••••',
      });

      expect(result.isRight()).toBe(true);

      // Valor armazenado deve continuar sendo o hash original
      const stored = await rowRepository.findOne({
        table: { slug: 'usuarios' } as any,
        query: { _id: row._id },
      });

      if (!stored) throw new Error('Row not found');
      expect(stored.senha).toBe(originalHash);
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makePasswordField({ slug: 'senha', required: true });
      const table = await makeTable(tableRepository, [field], {
        slug: 'usuarios',
      });

      const row = await rowRepository.create({
        table,
        data: { senha: await bcrypt.hash('senha', 12) },
      });

      const result = await sut.execute({
        slug: 'usuarios',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── PHONE ───

  describe('formato PHONE', () => {
    it('deve atualizar row com telefone valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'contatos',
      });

      const row = await rowRepository.create({
        table,
        data: { telefone: '(11) 99999-1234' },
      });

      const result = await sut.execute({
        slug: 'contatos',
        _id: row._id,
        telefone: '(21) 98888-5678',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar telefone invalido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'contatos',
      });

      const row = await rowRepository.create({
        table,
        data: { telefone: '(11) 99999-1234' },
      });

      const result = await sut.execute({
        slug: 'contatos',
        _id: row._id,
        telefone: '11999991234',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
        required: true,
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'contatos',
      });

      const row = await rowRepository.create({
        table,
        data: { telefone: '(11) 99999-1234' },
      });

      const result = await sut.execute({
        slug: 'contatos',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── CNPJ ───

  describe('formato CNPJ', () => {
    it('deve atualizar row com CNPJ valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CNPJ, {
        slug: 'cnpj',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'empresas',
      });

      const row = await rowRepository.create({
        table,
        data: { cnpj: '12.345.678/0001-90' },
      });

      const result = await sut.execute({
        slug: 'empresas',
        _id: row._id,
        cnpj: '98.765.432/0001-10',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar CNPJ sem formatacao', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CNPJ, {
        slug: 'cnpj',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'empresas',
      });

      const row = await rowRepository.create({
        table,
        data: { cnpj: '12.345.678/0001-90' },
      });

      const result = await sut.execute({
        slug: 'empresas',
        _id: row._id,
        cnpj: '12345678000190',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CNPJ, {
        slug: 'cnpj',
        required: true,
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'empresas',
      });

      const row = await rowRepository.create({
        table,
        data: { cnpj: '12.345.678/0001-90' },
      });

      const result = await sut.execute({
        slug: 'empresas',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });

  // ─── CPF ───

  describe('formato CPF', () => {
    it('deve atualizar row com CPF valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'pessoas',
      });

      const row = await rowRepository.create({
        table,
        data: { cpf: '123.456.789-01' },
      });

      const result = await sut.execute({
        slug: 'pessoas',
        _id: row._id,
        cpf: '987.654.321-00',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar CPF sem formatacao', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'pessoas',
      });

      const row = await rowRepository.create({
        table,
        data: { cpf: '123.456.789-01' },
      });

      const result = await sut.execute({
        slug: 'pessoas',
        _id: row._id,
        cpf: '12345678901',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve pular validacao de campo omitido (skipMissing)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
        required: true,
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'pessoas',
      });

      const row = await rowRepository.create({
        table,
        data: { cpf: '123.456.789-01' },
      });

      const result = await sut.execute({
        slug: 'pessoas',
        _id: row._id,
      });

      expect(result.isRight()).toBe(true);
    });
  });
});
