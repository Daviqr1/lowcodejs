import { beforeEach, describe, expect, it } from 'vitest';

import { E_FIELD_VALIDATION } from '@application/core/entity.core';
import RowInMemoryRepository from '@application/repositories/row/row-in-memory.repository';
import TableInMemoryRepository from '@application/repositories/table/table-in-memory.repository';
import UserInMemoryRepository from '@application/repositories/user/user-in-memory.repository';
import { makeTextShortField } from '@test/helpers/field-factory.helper';
import { makeTable } from '@test/helpers/table-factory.helper';

import FieldValidationService from './field-validation.service';

let tableRepository: TableInMemoryRepository;
let rowRepository: RowInMemoryRepository;
let userRepository: UserInMemoryRepository;
let sut: FieldValidationService;

describe('FieldValidationService', () => {
  beforeEach(() => {
    tableRepository = new TableInMemoryRepository();
    rowRepository = new RowInMemoryRepository();
    userRepository = new UserInMemoryRepository();
    sut = new FieldValidationService(rowRepository, userRepository);
  });

  describe('IS_UNIQUE', () => {
    it('rejeita valor ja existente na coluna da tabela', async () => {
      const field = makeTextShortField({
        slug: 'email',
        validations: [{ rule: E_FIELD_VALIDATION.IS_UNIQUE, config: {} }],
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });
      await rowRepository.create({ table, data: { email: 'a@a.com' } });

      const errors = await sut.validate({ email: 'a@a.com' }, table);
      expect(errors).not.toBeNull();
      expect(errors).toHaveProperty('email');
    });

    it('aceita valor inedito', async () => {
      const field = makeTextShortField({
        slug: 'email',
        validations: [{ rule: E_FIELD_VALIDATION.IS_UNIQUE, config: {} }],
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });
      await rowRepository.create({ table, data: { email: 'a@a.com' } });

      const errors = await sut.validate({ email: 'novo@a.com' }, table);
      expect(errors).toBeNull();
    });

    it('no update ignora a propria row (currentRowId)', async () => {
      const field = makeTextShortField({
        slug: 'email',
        validations: [{ rule: E_FIELD_VALIDATION.IS_UNIQUE, config: {} }],
      });
      const table = await makeTable(tableRepository, [field], {
        slug: 'clientes',
      });
      const row = await rowRepository.create({
        table,
        data: { email: 'a@a.com' },
      });

      const errors = await sut.validate({ email: 'a@a.com' }, table, {
        currentRowId: row._id,
      });
      expect(errors).toBeNull();
    });
  });

  describe('EMAIL_EXISTS', () => {
    it('passa quando o e-mail pertence a um usuario', async () => {
      await userRepository.create({
        name: 'Fulano',
        email: 'existe@x.com',
        password: 'x',
        group: 'g1',
      });
      const field = makeTextShortField({
        slug: 'email',
        validations: [{ rule: E_FIELD_VALIDATION.EMAIL_EXISTS, config: {} }],
      });
      const table = await makeTable(tableRepository, [field], { slug: 't' });

      expect(await sut.validate({ email: 'existe@x.com' }, table)).toBeNull();
    });

    it('falha quando nao ha usuario com o e-mail', async () => {
      const field = makeTextShortField({
        slug: 'email',
        validations: [{ rule: E_FIELD_VALIDATION.EMAIL_EXISTS, config: {} }],
      });
      const table = await makeTable(tableRepository, [field], { slug: 't' });

      const errors = await sut.validate({ email: 'ninguem@x.com' }, table);
      expect(errors).toHaveProperty('email');
    });
  });

  describe('USER_EXISTS', () => {
    it('passa quando o id corresponde a um usuario', async () => {
      const user = await userRepository.create({
        name: 'Fulano',
        email: 'u@x.com',
        password: 'x',
        group: 'g1',
      });
      const field = makeTextShortField({
        slug: 'responsavel',
        validations: [{ rule: E_FIELD_VALIDATION.USER_EXISTS, config: {} }],
      });
      const table = await makeTable(tableRepository, [field], { slug: 't' });

      expect(await sut.validate({ responsavel: user._id }, table)).toBeNull();
    });

    it('falha para id inexistente', async () => {
      const field = makeTextShortField({
        slug: 'responsavel',
        validations: [{ rule: E_FIELD_VALIDATION.USER_EXISTS, config: {} }],
      });
      const table = await makeTable(tableRepository, [field], { slug: 't' });

      const errors = await sut.validate(
        { responsavel: 'ffffffffffffffffffffffff' },
        table,
      );
      expect(errors).toHaveProperty('responsavel');
    });
  });

  it('campo sem validations nao gera erro', async () => {
    const field = makeTextShortField({ slug: 'nome' });
    const table = await makeTable(tableRepository, [field], { slug: 't' });
    expect(await sut.validate({ nome: 'qualquer' }, table)).toBeNull();
  });

  it('skipMissing ignora campos ausentes do payload', async () => {
    const field = makeTextShortField({
      slug: 'email',
      validations: [{ rule: E_FIELD_VALIDATION.NOT_EMPTY, config: {} }],
    });
    const table = await makeTable(tableRepository, [field], { slug: 't' });
    expect(await sut.validate({}, table, { skipMissing: true })).toBeNull();
  });
});
