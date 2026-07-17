/**
 * Resolve o id do criador de uma row, aceitando id em string ou objeto populado
 * `{ _id }`. Usado pelo enforcement "apenas a sua" (perfil contributor) nos
 * use-cases de update/delete/send-to-trash de registros.
 */
export function resolveCreatorId(creator: unknown): string | null {
  if (creator === null || creator === undefined) return null;
  if (typeof creator === 'string') return creator;
  if (typeof creator === 'object') {
    // Objeto populado (User { _id }): usa o _id.
    if ('_id' in creator && creator._id !== null && creator._id !== undefined) {
      return String(creator._id);
    }
    // ObjectId cru (findOne sem populate): ObjectId.toString() → hex.
    return String(creator);
  }
  return null;
}
