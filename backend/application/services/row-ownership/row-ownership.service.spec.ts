import { describe, expect, it } from 'vitest';

import RowOwnershipService from './row-ownership.service';

describe('RowOwnershipService', () => {
  const sut = new RowOwnershipService();

  it('devolve a string como esta', () => {
    expect(sut.resolveCreatorId('507f1f77bcf86cd799439011')).toBe(
      '507f1f77bcf86cd799439011',
    );
  });

  it('extrai o _id do objeto populado', () => {
    expect(sut.resolveCreatorId({ _id: 'abc', name: 'Ana' })).toBe('abc');
  });

  it('serializa ObjectId cru pelo toString', () => {
    const objectId = { toString: (): string => 'hex-id' };
    expect(sut.resolveCreatorId(objectId)).toBe('hex-id');
  });

  it('devolve null para ausente e para tipo inesperado', () => {
    expect(sut.resolveCreatorId(null)).toBeNull();
    expect(sut.resolveCreatorId(undefined)).toBeNull();
    expect(sut.resolveCreatorId(42)).toBeNull();
    expect(sut.resolveCreatorId({ _id: null })).toBe('[object Object]');
  });
});
