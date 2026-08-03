import { describe, expect, it } from 'vitest';

import { FieldSlug } from './field-slug.core';

describe('FieldSlug', () => {
  describe('normalize', () => {
    it('remove pontuação que quebraria o update path do Mongo', () => {
      expect(FieldSlug.normalize('Processo SEI n°.:')).toBe('processo-sei-n');
      expect(FieldSlug.normalize('N° de contrato.:')).toBe('n-de-contrato');
    });

    it('remove acentos e colapsa separadores', () => {
      expect(FieldSlug.normalize('Endereço  do   Cliente')).toBe(
        'endereco-do-cliente',
      );
    });

    it('não deixa hífen sobrando nas bordas', () => {
      expect(FieldSlug.normalize('  ...Valor total!  ')).toBe('valor-total');
    });
  });

  describe('getError', () => {
    it('rejeita o slug legado com ponto', () => {
      expect(FieldSlug.getError('processo-sei-n.')).not.toBeNull();
    });

    it('aceita o slug já normalizado', () => {
      expect(FieldSlug.getError('processo-sei-n')).toBeNull();
    });

    it('rejeita slug curto demais', () => {
      expect(FieldSlug.getError('a')).not.toBeNull();
    });
  });

  describe('resolve', () => {
    it('normaliza o slug informado em vez de confiar no cliente', () => {
      const result = FieldSlug.resolve({
        name: 'Processo SEI',
        slug: 'processo-sei-n.',
      });

      expect(result.slug).toBe('processo-sei-n');
      expect(result.error).toBeNull();
    });

    it('cai no name quando o slug vem vazio', () => {
      const result = FieldSlug.resolve({ name: 'N° de contrato.:', slug: '' });

      expect(result.slug).toBe('n-de-contrato');
      expect(result.error).toBeNull();
    });
  });

  describe('suggestUnique', () => {
    it('desambigua quando dois nomes normalizam para o mesmo slug', () => {
      expect(FieldSlug.suggestUnique('N° de contrato.:', [])).toBe(
        'n-de-contrato',
      );
      expect(
        FieldSlug.suggestUnique('N° de contrato.:', ['n-de-contrato']),
      ).toBe('n-de-contrato-2');
      expect(
        FieldSlug.suggestUnique('N° de contrato.:', [
          'n-de-contrato',
          'n-de-contrato-2',
        ]),
      ).toBe('n-de-contrato-3');
    });
  });
});
