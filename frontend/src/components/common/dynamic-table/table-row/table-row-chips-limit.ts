// Limite de chips exibidos antes de resumir o restante em "+N" — aplicável aos
// campos DROPDOWN, RELATIONSHIP e USER quando multiple. A config vem de
// `field.visibleChipsLimit`: null/ausente = sem limite, exibe todos os
// selecionados.
export function splitVisibleChips<T>(
  items: Array<T>,
  limit: number | null | undefined,
): { visible: Array<T>; hiddenCount: number } {
  if (!limit || limit <= 0 || items.length <= limit) {
    return { visible: items, hiddenCount: 0 };
  }
  return { visible: items.slice(0, limit), hiddenCount: items.length - limit };
}
