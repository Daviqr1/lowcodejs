import { describe, expect, it } from 'vitest';

import DateService from './date.service';

describe('DateService', () => {
  const sut = new DateService();

  describe('isoDate', () => {
    it('monta YYYY-MM-DD em UTC com zero a esquerda', () => {
      expect(sut.isoDate(new Date('2026-03-07T23:30:00.000Z'))).toBe(
        '2026-03-07',
      );
    });
  });

  describe('toIso', () => {
    it('normaliza Date e string para ISO', () => {
      expect(sut.toIso(new Date('2026-01-02T03:04:05.000Z'))).toBe(
        '2026-01-02T03:04:05.000Z',
      );
      expect(sut.toIso('2026-01-02T03:04:05.000Z')).toBe(
        '2026-01-02T03:04:05.000Z',
      );
    });

    it('devolve string vazia para ausente ou invalido', () => {
      expect(sut.toIso(null)).toBe('');
      expect(sut.toIso(undefined)).toBe('');
      expect(sut.toIso('')).toBe('');
      expect(sut.toIso('nao e data')).toBe('');
    });
  });

  describe('startOfDay / endOfDay', () => {
    it('recorta o dia em UTC', () => {
      expect(sut.startOfDay('2026-05-10T18:45:00.000Z').toISOString()).toBe(
        '2026-05-10T00:00:00.000Z',
      );
      expect(sut.endOfDay('2026-05-10T01:15:00.000Z').toISOString()).toBe(
        '2026-05-10T23:59:59.999Z',
      );
    });

    it('nao muta o valor recebido', () => {
      const original = new Date('2026-05-10T18:45:00.000Z');
      sut.startOfDay(original);
      expect(original.toISOString()).toBe('2026-05-10T18:45:00.000Z');
    });
  });

  describe('format', () => {
    it('aplica a mascara padrao', () => {
      expect(sut.format(new Date(2026, 2, 7))).toBe('07/03/2026');
    });

    it('aplica mascara customizada com hora', () => {
      expect(
        sut.format(new Date(2026, 2, 7, 9, 5, 3), 'yyyy-MM-dd HH:mm:ss'),
      ).toBe('2026-03-07 09:05:03');
    });

    it('devolve string vazia para data invalida', () => {
      expect(sut.format(new Date('x'))).toBe('');
    });
  });

  describe('monthKey', () => {
    it('monta YYYY-MM', () => {
      expect(sut.monthKey(new Date(2026, 0, 31))).toBe('2026-01');
    });
  });

  describe('lastMonths', () => {
    it('devolve os N meses com o mais antigo primeiro', () => {
      const buckets = sut.lastMonths(6);
      expect(buckets).toHaveLength(6);
      expect(buckets.at(-1)?.key).toBe(sut.monthKey(sut.now()));
    });
  });
});
