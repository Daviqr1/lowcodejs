import { describe, expect, it } from 'vitest';

import SlugService from './slug.service';

describe('SlugService', () => {
  const sut = new SlugService();

  describe('normalize', () => {
    it('remove acentos e coloca em minusculo', () => {
      expect(sut.normalize('Relatório Anual')).toBe('relatorio-anual');
    });

    it('descarta os caracteres que o modo nao-strict deixava passar', () => {
      // Era o defeito reparado pela migration 29: 6 chamadas de `slugify` sem
      // `strict: true` gravavam esses simbolos direto no slug. `$` vira
      // `dollar` pelo charmap do slugify antes do `strict` agir.
      expect(sut.normalize('Custo: R$ 10 (unit) ~ \'a\' "b" !@')).toBe(
        'custo-rdollar-10-unit-a-b',
      );
      expect(sut.normalize('a.b:c*d_e~f(g)')).toBe('abcdefg');
    });

    it('colapsa hifens repetidos e apara as pontas', () => {
      expect(sut.normalize('--a---b--')).toBe('a-b');
      expect(sut.normalize('  ...Valor total!  ')).toBe('valor-total');
    });

    // Herdado do antigo `field-slug.core.spec.ts`: pontuacao no slug quebrava o
    // update path do Mongo.
    it('remove pontuacao que quebraria o update path do Mongo', () => {
      expect(sut.normalize('Processo SEI n°.:')).toBe('processo-sei-n');
      expect(sut.normalize('N° de contrato.:')).toBe('n-de-contrato');
    });

    it('remove acentos e colapsa separadores repetidos', () => {
      expect(sut.normalize('Endereço  do   Cliente')).toBe(
        'endereco-do-cliente',
      );
    });

    it('limita a 80 caracteres sem deixar hifen na ponta', () => {
      const slug = sut.normalize('a'.repeat(100));
      expect(slug).toHaveLength(80);
      expect(slug.endsWith('-')).toBe(false);
    });
  });

  describe('getError', () => {
    it('aceita slug valido', () => {
      expect(sut.getError('nome-do-campo')).toBeNull();
    });

    it('rejeita slug curto demais', () => {
      expect(sut.getError('a')).toContain('mínimo');
    });

    it('rejeita slug longo demais', () => {
      expect(sut.getError('a'.repeat(81))).toContain('máximo');
    });

    it('rejeita caractere fora do padrao', () => {
      expect(sut.getError('Nome_Do_Campo')).toContain('letras minúsculas');
    });

    it('rejeita o slug legado com ponto', () => {
      expect(sut.getError('processo-sei-n.')).not.toBeNull();
    });
  });

  describe('resolve', () => {
    it('deriva do nome quando nao ha slug', () => {
      expect(sut.resolve({ name: 'Data de Nascimento' })).toEqual({
        slug: 'data-de-nascimento',
        error: null,
      });
    });

    it('prefere o slug informado', () => {
      expect(sut.resolve({ name: 'Ignorado', slug: ' Meu Slug ' })).toEqual({
        slug: 'meu-slug',
        error: null,
      });
    });

    it('cai para o nome quando o slug e so espaco', () => {
      expect(sut.resolve({ name: 'Fallback', slug: '   ' }).slug).toBe(
        'fallback',
      );
    });

    it('normaliza o slug informado em vez de confiar no cliente', () => {
      expect(
        sut.resolve({ name: 'Processo SEI', slug: 'processo-sei-n.' }),
      ).toEqual({ slug: 'processo-sei-n', error: null });
    });

    it('cai no name quando o slug vem vazio', () => {
      expect(sut.resolve({ name: 'N° de contrato.:', slug: '' })).toEqual({
        slug: 'n-de-contrato',
        error: null,
      });
    });
  });

  describe('unique', () => {
    it('devolve a base quando esta livre', () => {
      expect(sut.unique('Telefone', ['email'])).toBe('telefone');
    });

    it('desambigua com sufixo numerico', () => {
      expect(sut.unique('Telefone', ['telefone', 'telefone-2'])).toBe(
        'telefone-3',
      );
    });

    it('desambigua quando dois nomes normalizam para o mesmo slug', () => {
      expect(sut.unique('N° de contrato.:', [])).toBe('n-de-contrato');
      expect(sut.unique('N° de contrato.:', ['n-de-contrato'])).toBe(
        'n-de-contrato-2',
      );
      expect(
        sut.unique('N° de contrato.:', ['n-de-contrato', 'n-de-contrato-2']),
      ).toBe('n-de-contrato-3');
    });

    it('usa o fallback quando o nome normaliza para vazio', () => {
      expect(sut.unique('!!!', [])).toBe('campo');
    });
  });

  describe('toKey', () => {
    it('troca hifen por underscore', () => {
      expect(sut.toKey('data-nascimento')).toBe('data_nascimento');
    });
  });

  describe('toAscii', () => {
    it('remove diacriticos e aspas, preservando a extensao', () => {
      expect(sut.toAscii('relatório "final".pdf')).toBe('relatorio final.pdf');
    });
  });
});
