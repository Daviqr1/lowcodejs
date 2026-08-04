import { describe, expect, it } from 'vitest';

import MongooseIdentifierService from './identifier.service';

describe('MongooseIdentifierService', () => {
  const sut = new MongooseIdentifierService();

  describe('isValid', () => {
    it('aceita ObjectId hex de 24 caracteres', () => {
      expect(sut.isValid('507f1f77bcf86cd799439011')).toBe(true);
      expect(sut.isValid('507F1F77BCF86CD799439011')).toBe(true);
    });

    it('rejeita tamanho errado e caractere fora do hex', () => {
      expect(sut.isValid('507f1f77bcf86cd79943901')).toBe(false);
      expect(sut.isValid('zzzf1f77bcf86cd799439011')).toBe(false);
      expect(sut.isValid('')).toBe(false);
    });
  });

  describe('generate', () => {
    it('gera UUID v4 unico', () => {
      const first = sut.generate();
      expect(first).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(first).not.toBe(sut.generate());
    });
  });
});
