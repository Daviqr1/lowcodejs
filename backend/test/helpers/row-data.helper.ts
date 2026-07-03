// Helpers de teste para ler dados dinâmicos de uma row (campos indexados como
// Record<string, unknown>) sem recorrer a asserção de tipo (`as`).

// Extrai os itens de um campo FIELD_GROUP (array de subdocumentos) de uma row,
// narrando cada item para Record<string, unknown> via checagem em runtime.
export function groupItems(
  row: Record<string, unknown>,
  slug: string,
): Array<Record<string, unknown>> {
  const value = row[slug];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null,
  );
}

// _id do último item de um grupo, como string.
export function lastItemId(items: Array<Record<string, unknown>>): string {
  const last = items[items.length - 1];
  return String(last?._id ?? '');
}
