export function parseMenuPosition(
  position: string,
  parentId: string | null | undefined,
): number | null {
  const value = position.trim();
  const hasParent = Boolean(parentId);

  if (!value) return null;

  if (!hasParent) {
    if (!/^\d+$/.test(value)) return null;
    return Number(value);
  }

  if (/^\d+$/.test(value)) {
    const childPosition = Number(value);
    if (childPosition > 0) return childPosition - 1;
    return null;
  }

  if (!/^\d+(?:\.\d+)+$/.test(value)) return null;

  const parts = value.split('.');
  const childPosition = Number(parts[parts.length - 1]);
  if (!Number.isInteger(childPosition) || childPosition <= 0) return null;

  return childPosition - 1;
}
