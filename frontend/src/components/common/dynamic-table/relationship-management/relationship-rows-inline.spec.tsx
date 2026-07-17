import { describe, expect, it } from 'vitest';

import { isSingleLocked, otherIdOf } from './relationship-rows-inline';

import type { IRelationshipLink } from '@/lib/interfaces';

function link(sourceId: string, targetId: string): IRelationshipLink {
  return {
    _id: 'l1',
    relationshipId: 'r1',
    sourceId,
    targetId,
    order: 0,
    metadata: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('relationship-rows-inline helpers', () => {
  it('otherIdOf retorna target no lado source e source no lado target', () => {
    expect(otherIdOf(link('a', 'b'), 'source')).toBe('b');
    expect(otherIdOf(link('a', 'b'), 'target')).toBe('a');
  });

  it('isSingleLocked só trava quando não-múltiplo e há ao menos um card', () => {
    expect(isSingleLocked(true, 2)).toBe(false);
    expect(isSingleLocked(false, 0)).toBe(false);
    expect(isSingleLocked(false, 1)).toBe(true);
  });
});
