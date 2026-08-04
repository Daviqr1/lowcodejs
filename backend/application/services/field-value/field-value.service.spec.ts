import { describe, expect, it } from 'vitest';

import { E_FIELD_FORMAT, E_FIELD_TYPE } from '@application/core/entity.core';
import { makeTextShortField as makeField } from '@test/helpers/field-factory.helper';

import FieldValueService from './field-value.service';

describe('FieldValueService', () => {
  const sut = new FieldValueService();

  describe('typeOf', () => {
    it('resolve o tipo pelo slug', () => {
      const fields = [
        makeField({ slug: 'nome' }),
        makeField({ slug: 'idade' }),
      ];
      expect(sut.typeOf(fields, 'idade')).toBe(E_FIELD_TYPE.TEXT_SHORT);
      expect(sut.typeOf(fields, 'inexistente')).toBeUndefined();
    });
  });

  describe('read', () => {
    it('acha a chave nas duas grafias do slug', () => {
      expect(sut.read({ 'data-nascimento': 1 }, 'data-nascimento')).toBe(1);
      expect(sut.read({ data_nascimento: 2 }, 'data-nascimento')).toBe(2);
      expect(sut.read({ 'data-nascimento': 3 }, 'data_nascimento')).toBe(3);
    });

    it('devolve undefined quando nao existe', () => {
      expect(sut.read({}, 'ausente')).toBeUndefined();
    });
  });

  describe('infer', () => {
    it('converte booleano, inteiro, decimal e data ISO', () => {
      expect(sut.infer('true')).toBe(true);
      expect(sut.infer('FALSE')).toBe(false);
      expect(sut.infer('42')).toBe(42);
      expect(sut.infer('3.5')).toBe(3.5);
      expect(sut.infer('2026-03-07')).toBeInstanceOf(Date);
    });

    it('devolve o valor original quando nao reconhece', () => {
      expect(sut.infer('texto livre')).toBe('texto livre');
      expect(sut.infer('')).toBe('');
      expect(sut.infer(null)).toBeNull();
      expect(sut.infer({ a: 1 })).toEqual({ a: 1 });
    });
  });

  describe('coerce', () => {
    it('descarta os tipos que nao voltam do CSV', () => {
      for (const type of [
        E_FIELD_TYPE.USER,
        E_FIELD_TYPE.USER_GROUP,
        E_FIELD_TYPE.FILE,
        E_FIELD_TYPE.FIELD_GROUP,
      ]) {
        expect(
          sut.coerce('qualquer', makeField({ type, format: null })),
        ).toBeUndefined();
      }
    });

    it('descarta celula vazia', () => {
      expect(sut.coerce('', makeField({ format: null }))).toBeUndefined();
    });

    it('reconstroi array de DROPDOWN e CATEGORY', () => {
      const field = makeField({ type: E_FIELD_TYPE.DROPDOWN });
      expect(sut.coerce('a; b ;; c', field)).toEqual(['a', 'b', 'c']);
    });

    it('converte DATE valida e devolve o texto quando invalida', () => {
      const field = makeField({ type: E_FIELD_TYPE.DATE });
      expect(sut.coerce('2026-03-07', field)).toBeInstanceOf(Date);
      expect(sut.coerce('nao e data', field)).toBe('nao e data');
    });

    it('converte por format INTEGER e DECIMAL', () => {
      expect(
        sut.coerce('42', makeField({ format: E_FIELD_FORMAT.INTEGER })),
      ).toBe(42);
      expect(
        sut.coerce('3.5', makeField({ format: E_FIELD_FORMAT.DECIMAL })),
      ).toBe(3.5);
      expect(
        sut.coerce('x', makeField({ format: E_FIELD_FORMAT.INTEGER })),
      ).toBe('x');
    });

    it('resolve RELATIONSHIP pelo resolver, e descarta sem ele', () => {
      const field = makeField({ type: E_FIELD_TYPE.RELATIONSHIP });
      expect(sut.coerce('Acme', field, () => ['id-1'])).toEqual(['id-1']);
      expect(sut.coerce('Acme', field, () => [])).toBeUndefined();
      expect(sut.coerce('Acme', field)).toBeUndefined();
    });
  });

  describe('format', () => {
    it('serializa primitivos e vazios', () => {
      expect(sut.format(null)).toBe('');
      expect(sut.format(undefined)).toBe('');
      expect(sut.format(true)).toBe('true');
      expect(sut.format(7)).toBe('7');
      expect(sut.format(new Date('2026-01-02T03:04:05.000Z'))).toBe(
        '2026-01-02T03:04:05.000Z',
      );
    });

    it('tira HTML de TEXT_LONG', () => {
      expect(
        sut.format('<p>Ola   <b>mundo</b></p>', {
          fieldType: E_FIELD_TYPE.TEXT_LONG,
        }),
      ).toBe('Ola mundo');
    });

    it('une array e descarta itens vazios', () => {
      expect(sut.format(['a', null, 'b'])).toBe('a; b');
    });

    it('escolhe filename ou url conforme preferUrlForFiles', () => {
      const file = { originalName: 'nota.pdf', url: 'http://x/nota.pdf' };
      const context = { fieldType: E_FIELD_TYPE.FILE };
      expect(sut.format(file, context)).toBe('nota.pdf');
      expect(sut.format(file, { ...context, preferUrlForFiles: true })).toBe(
        'http://x/nota.pdf',
      );
    });

    it('rotula relacionamento populado na ordem name/title/label/email/slug', () => {
      expect(sut.format({ title: 'Contrato', slug: 'c' })).toBe('Contrato');
      expect(sut.format({ _id: 'abc' })).toBe('abc');
    });
  });

  describe('normalizeDefault', () => {
    it('vira array nos tipos de multipla escolha', () => {
      expect(sut.normalizeDefault('DROPDOWN', 'a')).toEqual(['a']);
      expect(sut.normalizeDefault('DROPDOWN', ['a', 'b'])).toEqual(['a', 'b']);
      expect(sut.normalizeDefault('DROPDOWN', [])).toBeNull();
    });

    it('vira string nos tipos de valor unico', () => {
      expect(sut.normalizeDefault('TEXT_SHORT', 'a')).toBe('a');
      expect(sut.normalizeDefault('TEXT_SHORT', ['a', 'b'])).toBe('a');
      expect(sut.normalizeDefault('TEXT_SHORT', '')).toBeNull();
    });

    it('e null para tipo sem defaultValue e para ausente', () => {
      expect(sut.normalizeDefault('REACTION', 'a')).toBeNull();
      expect(sut.normalizeDefault('TEXT_SHORT', null)).toBeNull();
      expect(sut.normalizeDefault('TEXT_SHORT', undefined)).toBeNull();
    });
  });

  describe('hasDuplicateLabels', () => {
    it('ignora caixa e espaco na comparacao', () => {
      expect(
        sut.hasDuplicateLabels([{ label: 'Sim' }, { label: ' sim ' }]),
      ).toBe(true);
    });

    it('aceita lista sem repeticao, vazia ou ausente', () => {
      expect(sut.hasDuplicateLabels([{ label: 'Sim' }, { label: 'Nao' }])).toBe(
        false,
      );
      expect(sut.hasDuplicateLabels([])).toBe(false);
      expect(sut.hasDuplicateLabels(null)).toBe(false);
    });
  });
});
