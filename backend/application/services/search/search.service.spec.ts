import { describe, expect, it } from 'vitest';

import SearchService from './search.service';

describe('SearchService', () => {
  const sut = new SearchService();

  describe('escape', () => {
    it('neutraliza os metacaracteres de regex', () => {
      expect(sut.escape('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe(
        'a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o',
      );
    });

    it('mantem texto sem metacaractere intacto', () => {
      expect(sut.escape('relatorio anual')).toBe('relatorio anual');
    });

    it('produz padrao que casa a string literal, nao o padrao', () => {
      const term = 'preco (R$)';
      const pattern = new RegExp(sut.escape(term), 'i');
      expect(pattern.test('Preco (R$)')).toBe(true);
      expect(pattern.test('preco XRY')).toBe(false);
    });
  });

  describe('normalize', () => {
    it('escapa antes de expandir os acentos', () => {
      // O `.` vira `\.` e nao a classe de qualquer caractere.
      expect(sut.normalize('.')).toBe('\\.');
    });

    it('expande cada letra acentuavel na classe correspondente', () => {
      expect(sut.normalize('acao')).toBe('[aáàâãä][cç][aáàâãä][oóòôõö]');
    });

    it('casa o termo independente de acento e caixa', () => {
      const pattern = new RegExp(sut.normalize('acao'), 'i');
      expect(pattern.test('ação')).toBe(true);
      expect(pattern.test('AÇÃO')).toBe(true);
      expect(pattern.test('acao')).toBe(true);
    });

    it('nao deixa entrada do usuario virar quantificador', () => {
      // Sem escape, `a{1,99999}` seria um quantificador — vetor de ReDoS.
      const pattern = new RegExp(sut.normalize('a{1,3}'), 'i');
      expect(pattern.test('a{1,3}')).toBe(true);
      expect(pattern.test('aaa')).toBe(false);
    });
  });
});
