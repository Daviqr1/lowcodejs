import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { E_FIELD_FORMAT } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import FieldValidationService from '@application/services/field-validation/field-validation.service';
import FieldValidationRuleRegistryService from '@application/services/field-validation/rule-registry.service';
import InMemoryFieldVisibilityService from '@application/services/field-visibility/in-memory-field-visibility.service';
import MongooseIdentifierService from '@application/services/identifier/identifier.service';
import { InMemoryRowAccessGuardService } from '@application/services/row-access-guard/in-memory-row-access-guard.service';
import InMemoryRowMemberNotificationService from '@application/services/row-member-notification/in-memory-row-member-notification.service';
import BcryptRowPasswordService from '@application/services/row-password/row-password.service';
import RowPayloadValidatorService from '@application/services/row-payload-validator/row-payload-validator.service';
import InMemoryScriptExecutionService from '@application/services/script-execution/in-memory-script-execution.service';
import SlugService from '@application/services/slug/slug.service';
import {
  makePasswordField,
  makeTextShortWithFormat,
} from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import TableRowCreateUseCase from '../create.use-case';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let rowPasswordService: BcryptRowPasswordService;
let scriptExecutionService: InMemoryScriptExecutionService;
let sut: TableRowCreateUseCase;

describe('Table Row Create - TEXT_SHORT', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    userRepository = new UserInMemoryRepository();
    rowPasswordService = new BcryptRowPasswordService();

    scriptExecutionService = new InMemoryScriptExecutionService();

    sut = new TableRowCreateUseCase(
      tableRepository,
      rowRepository,
      userRepository,
      rowPasswordService,
      scriptExecutionService,
      new InMemoryRowMemberNotificationService(),
      new InMemoryFieldVisibilityService(),
      new FieldValidationService(
        rowRepository,
        userRepository,
        new FieldValidationRuleRegistryService(),
      ),
      new InMemoryRowAccessGuardService(),
      new SlugService(),
      new RowPayloadValidatorService(new MongooseIdentifierService()),
    );
  });

  // ─── ALPHA_NUMERIC ───

  describe('formato ALPHA_NUMERIC', () => {
    it('deve criar row com valor string valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        name: 'Nome',
      });
      await makeTable(tableRepository, [field], { slug: 'clientes' });

      const result = await sut.execute({
        slug: 'clientes',
        nome: 'Joao Silva',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');
      expect(result.value.nome).toBe('Joao Silva');
    });

    it('deve aceitar valor vazio quando nao required', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        required: false,
      });
      await makeTable(tableRepository, [field], { slug: 'clientes' });

      const result = await sut.execute({
        slug: 'clientes',
        nome: '',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar quando required e valor ausente', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.ALPHA_NUMERIC, {
        slug: 'nome',
        required: true,
      });
      await makeTable(tableRepository, [field], { slug: 'clientes' });

      const result = await sut.execute({
        slug: 'clientes',
        creator: 'user-id',
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
      await makeTable(tableRepository, [field], { slug: 'clientes' });

      const result = await sut.execute({
        slug: 'clientes',
        nome: 12345,
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });
  });

  // ─── INTEGER ───

  describe('formato INTEGER', () => {
    it('deve criar row com valor inteiro valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'idade',
      });
      await makeTable(tableRepository, [field], { slug: 'clientes' });

      const result = await sut.execute({
        slug: 'clientes',
        idade: '25',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve aceitar inteiro negativo', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'saldo',
      });
      await makeTable(tableRepository, [field], { slug: 'clientes' });

      const result = await sut.execute({
        slug: 'clientes',
        saldo: '-42',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar valor decimal', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'idade',
      });
      await makeTable(tableRepository, [field], { slug: 'clientes' });

      const result = await sut.execute({
        slug: 'clientes',
        idade: '12.5',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
      if (!result.isLeft()) throw new Error('Expected left');
      expect(result.value.cause).toBe('INVALID_PAYLOAD_FORMAT');
    });

    it('deve rejeitar texto nao numerico', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.INTEGER, {
        slug: 'idade',
      });
      await makeTable(tableRepository, [field], { slug: 'clientes' });

      const result = await sut.execute({
        slug: 'clientes',
        idade: 'abc',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── DECIMAL ───

  describe('formato DECIMAL', () => {
    it('deve criar row com valor decimal valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.DECIMAL, {
        slug: 'preco',
      });
      await makeTable(tableRepository, [field], { slug: 'produtos' });

      const result = await sut.execute({
        slug: 'produtos',
        preco: '19.99',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve aceitar inteiro como decimal', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.DECIMAL, {
        slug: 'preco',
      });
      await makeTable(tableRepository, [field], { slug: 'produtos' });

      const result = await sut.execute({
        slug: 'produtos',
        preco: '100',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar texto nao numerico', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.DECIMAL, {
        slug: 'preco',
      });
      await makeTable(tableRepository, [field], { slug: 'produtos' });

      const result = await sut.execute({
        slug: 'produtos',
        preco: 'abc',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── URL ───

  describe('formato URL', () => {
    it('deve criar row com URL valida', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
      });
      await makeTable(tableRepository, [field], { slug: 'empresas' });

      const result = await sut.execute({
        slug: 'empresas',
        site: 'https://example.com',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve aceitar URL com http', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
      });
      await makeTable(tableRepository, [field], { slug: 'empresas' });

      const result = await sut.execute({
        slug: 'empresas',
        site: 'http://example.com',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar URL sem protocolo', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
      });
      await makeTable(tableRepository, [field], { slug: 'empresas' });

      const result = await sut.execute({
        slug: 'empresas',
        site: 'example.com',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
    });

    it('deve rejeitar URL invalida', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.URL, {
        slug: 'site',
      });
      await makeTable(tableRepository, [field], { slug: 'empresas' });

      const result = await sut.execute({
        slug: 'empresas',
        site: 'not-a-url',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── EMAIL ───

  describe('formato EMAIL', () => {
    it('deve criar row com email valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
      });
      await makeTable(tableRepository, [field], { slug: 'contatos' });

      const result = await sut.execute({
        slug: 'contatos',
        email: 'user@example.com',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar email invalido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
      });
      await makeTable(tableRepository, [field], { slug: 'contatos' });

      const result = await sut.execute({
        slug: 'contatos',
        email: 'not-email',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
    });

    it('deve rejeitar email sem dominio', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.EMAIL, {
        slug: 'email',
      });
      await makeTable(tableRepository, [field], { slug: 'contatos' });

      const result = await sut.execute({
        slug: 'contatos',
        email: 'user@',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── PASSWORD ───

  describe('formato PASSWORD', () => {
    it('deve criar row e hashear a senha com bcrypt', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTable(tableRepository, [field], {
        slug: 'usuarios',
      });

      const result = await sut.execute({
        slug: 'usuarios',
        senha: 'minha-senha-123',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      // Retorno deve estar mascarado
      expect(result.value.senha).toBe('••••••••');

      // Valor armazenado no repositorio deve ser hash bcrypt
      const stored = await rowRepository.findOne({
        table,
        query: { _id: result.value._id },
      });
      expect(stored).toBeDefined();
      const isHashed =
        String(stored!.senha).startsWith('$2a$') ||
        String(stored!.senha).startsWith('$2b$');
      expect(isHashed).toBe(true);

      const matches = await bcrypt.compare(
        'minha-senha-123',
        String(stored!.senha),
      );
      expect(matches).toBe(true);
    });

    it('deve mascarar senha no retorno', async () => {
      const field = makePasswordField({ slug: 'senha' });
      await makeTable(tableRepository, [field], { slug: 'usuarios' });

      const result = await sut.execute({
        slug: 'usuarios',
        senha: 'test-password',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');
      expect(result.value.senha).toBe('••••••••');
    });

    it('deve aceitar valor vazio quando nao required', async () => {
      const field = makePasswordField({ slug: 'senha', required: false });
      await makeTable(tableRepository, [field], { slug: 'usuarios' });

      const result = await sut.execute({
        slug: 'usuarios',
        senha: '',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('nao deve hashear valor ja hasheado', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTable(tableRepository, [field], {
        slug: 'usuarios',
      });

      const preHashed = await bcrypt.hash('original', 12);

      const result = await sut.execute({
        slug: 'usuarios',
        senha: preHashed,
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      // Valor armazenado deve ser o mesmo hash, nao re-hasheado
      const stored = await rowRepository.findOne({
        table,
        query: { _id: result.value._id },
      });
      expect(stored!.senha).toBe(preHashed);
    });

    it('nao deve hashear mascara', async () => {
      const field = makePasswordField({ slug: 'senha' });
      const table = await makeTable(tableRepository, [field], {
        slug: 'usuarios',
      });

      const result = await sut.execute({
        slug: 'usuarios',
        senha: '••••••••',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
      if (!result.isRight()) throw new Error('Expected right');

      const stored = await rowRepository.findOne({
        table,
        query: { _id: result.value._id },
      });

      if (!stored) throw new Error('Row not found');
      // Mascara nao deve ser hasheada
      expect(stored.senha).toBe('••••••••');
    });
  });

  // ─── PHONE ───

  describe('formato PHONE', () => {
    it('deve criar row com telefone valido (com espaco)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
      });
      await makeTable(tableRepository, [field], { slug: 'contatos' });

      const result = await sut.execute({
        slug: 'contatos',
        telefone: '(11) 99999-1234',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve criar row com telefone valido (sem espaco)', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
      });
      await makeTable(tableRepository, [field], { slug: 'contatos' });

      const result = await sut.execute({
        slug: 'contatos',
        telefone: '(11)99999-1234',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve criar row com telefone fixo valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
      });
      await makeTable(tableRepository, [field], { slug: 'contatos' });

      const result = await sut.execute({
        slug: 'contatos',
        telefone: '(11) 3456-7890',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar telefone invalido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.PHONE, {
        slug: 'telefone',
      });
      await makeTable(tableRepository, [field], { slug: 'contatos' });

      const result = await sut.execute({
        slug: 'contatos',
        telefone: '11999991234',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── CNPJ ───

  describe('formato CNPJ', () => {
    it('deve criar row com CNPJ valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CNPJ, {
        slug: 'cnpj',
      });
      await makeTable(tableRepository, [field], { slug: 'empresas' });

      const result = await sut.execute({
        slug: 'empresas',
        cnpj: '12.345.678/0001-90',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar CNPJ sem formatacao', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CNPJ, {
        slug: 'cnpj',
      });
      await makeTable(tableRepository, [field], { slug: 'empresas' });

      const result = await sut.execute({
        slug: 'empresas',
        cnpj: '12345678000190',
        creator: 'user-id',
      });

      expect(result.isLeft()).toBe(true);
    });
  });

  // ─── CPF ───

  describe('formato CPF', () => {
    it('deve criar row com CPF valido', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
      });
      await makeTable(tableRepository, [field], { slug: 'pessoas' });

      const result = await sut.execute({
        slug: 'pessoas',
        cpf: '123.456.789-01',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });

    it('deve rejeitar CPF sem formatacao', async () => {
      const field = makeTextShortWithFormat(E_FIELD_FORMAT.CPF, {
        slug: 'cpf',
      });
      await makeTable(tableRepository, [field], { slug: 'pessoas' });

      const result = await sut.execute({
        slug: 'pessoas',
        cpf: '12345678901',
        creator: 'user-id',
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
      await makeTable(tableRepository, [emailField, cpfField], {
        slug: 'cadastro',
      });

      const result = await sut.execute({
        slug: 'cadastro',
        email: 'invalido',
        cpf: '000',
        creator: 'user-id',
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
      await makeTable(tableRepository, [emailField, cpfField], {
        slug: 'cadastro',
      });

      const result = await sut.execute({
        slug: 'cadastro',
        email: 'user@test.com',
        cpf: '123.456.789-01',
        creator: 'user-id',
      });

      expect(result.isRight()).toBe(true);
    });
  });
});
