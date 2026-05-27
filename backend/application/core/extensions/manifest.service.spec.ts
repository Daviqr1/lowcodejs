import { describe, it, expect } from 'vitest';

import { ManifestSchema } from './manifest.schema';

describe('ManifestSchema', () => {
  it('aceita placement.kind = "row-access-guard" para plugins sem slot', () => {
    const result = ManifestSchema.safeParse({
      id: 'row-access',
      type: 'PLUGIN',
      name: 'Visibilidade por Papel',
      version: '1.0.0',
      placement: { kind: 'row-access-guard' },
    });
    expect(result.success).toBe(true);
  });

  it('aceita placement com slot', () => {
    const withSlot = ManifestSchema.safeParse({
      id: 'export-pdf',
      type: 'PLUGIN',
      name: 'Exportar',
      version: '1.0.0',
      placement: { slot: 'table.actions' },
    });
    expect(withSlot.success).toBe(true);
  });

  it('rejeita placement vazio (sem slot nem kind)', () => {
    const result = ManifestSchema.safeParse({
      id: 'foo',
      type: 'PLUGIN',
      name: 'Foo',
      version: '1.0.0',
      placement: {},
    });
    expect(result.success).toBe(false);
  });
});
