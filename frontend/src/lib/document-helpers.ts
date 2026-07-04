import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, ILayoutFields, IRow } from '@/lib/interfaces';
import { resolveLayoutField } from '@/lib/layout-field-resolver';

export type DocBlock = {
  id: string;
  titleField: IField;
  bodyField?: IField;
};

export type CatNode = { id: string; label: string; children?: Array<CatNode> };

export function headerSorter(order: Array<string>) {
  return (a: IField, b: IField): number => {
    const idxA = order.indexOf(a._id);
    const idxB = order.indexOf(b._id);
    let rankA = idxA;
    if (idxA === -1) rankA = Infinity;
    let rankB = idxB;
    if (idxB === -1) rankB = Infinity;
    return rankA - rankB;
  };
}

export function firstCategoryField(
  headers: Array<IField>,
  order: Array<string>,
  layoutFields?: ILayoutFields | null,
): IField | undefined {
  const sorted = headers.filter((h) => !h.trashed).sort(headerSorter(order));
  return resolveLayoutField(
    sorted,
    layoutFields,
    'category',
    E_FIELD_TYPE.CATEGORY,
  );
}

export function buildDepthMap(
  nodes: Array<CatNode>,
  depth = 0,
  map = new Map<string, number>(),
): Map<string, number> {
  for (const n of nodes) {
    map.set(n.id, depth);
    if (n.children?.length) buildDepthMap(n.children, depth + 1, map);
  }
  return map;
}

export function buildLabelMap(
  nodes: Array<CatNode>,
  map = new Map<string, string>(),
): Map<string, string> {
  for (const n of nodes) {
    map.set(n.id, n.label);
    if (n.children?.length) buildLabelMap(n.children, map);
  }
  return map;
}

export function buildDocBlocks(
  headersOrdered: Array<IField>,
  layoutFields?: ILayoutFields | null,
): Array<DocBlock> {
  const h = headersOrdered.filter((x) => !x.trashed);

  const blocks: Array<DocBlock> = [];

  const titleField = resolveLayoutField(
    h,
    layoutFields,
    'title',
    E_FIELD_TYPE.TEXT_SHORT,
  );
  const bodyField = resolveLayoutField(
    h,
    layoutFields,
    'description',
    E_FIELD_TYPE.TEXT_LONG,
  );

  blocks.push({
    id: `block-${titleField?.slug}`,
    titleField: titleField!,
    bodyField,
  });

  return blocks;
}

export function getStr(v: unknown): string {
  if (typeof v === 'string') return v;
  return '';
}

export function rowMatchesCategory(
  row: IRow,
  categorySlug: string,
  selectedId: string | null,
  descendantsMap?: Map<string, Set<string>>,
): boolean {
  if (!selectedId) return true;

  const allowed = new Set<string>([
    selectedId,
    ...(descendantsMap?.get(selectedId) ?? new Set<string>()),
  ]);

  const v = row[categorySlug];

  if (Array.isArray(v)) {
    return v.some((id) => allowed.has(String(id)));
  }
  if (typeof v === 'string') {
    return allowed.has(v);
  }
  return false;
}

export function rowIndentPxFromLeaf(
  row: IRow,
  categorySlug: string,
  depthMap: Map<string, number>,
): number {
  const v = row[categorySlug];
  let leaf: string | null = null;

  if (Array.isArray(v) && v.length) leaf = v[v.length - 1];
  else if (typeof v === 'string') leaf = v;

  let depth = 0;
  if (leaf) depth = depthMap.get(leaf) ?? 0;
  return depth * 16;
}

export function rowHeadingLevelFromLeaf(
  row: IRow,
  categorySlug: string,
  depthMap: Map<string, number>,
): number {
  const v = row[categorySlug];
  let leaf: string | null = null;

  if (Array.isArray(v) && v.length) leaf = v[v.length - 1];
  else if (typeof v === 'string') leaf = v;

  let depth = 0;
  if (leaf) depth = depthMap.get(leaf) ?? 0;

  return Math.max(2, Math.min(6, 2 + depth));
}

export function rowLeafLabel(
  row: IRow,
  categorySlug: string,
  labelMap: Map<string, string>,
): string | null {
  const v = row[categorySlug];
  let leaf: string | null = null;
  if (Array.isArray(v) && v.length) leaf = v[v.length - 1];
  else if (typeof v === 'string') leaf = v;

  if (!leaf) return null;
  return labelMap.get(leaf) ?? null;
}

export function buildCategoryOrderMap(
  nodes: Array<CatNode>,
  map = new Map<string, number>(),
  counterRef = { i: 0 },
): Map<string, number> {
  for (const n of nodes) {
    map.set(n.id, counterRef.i++);
    if (n.children?.length) buildCategoryOrderMap(n.children, map, counterRef);
  }
  return map;
}

export function getRowLeafId(row: IRow, categorySlug: string): string | null {
  const v = row[categorySlug];
  if (Array.isArray(v) && v.length) return v[v.length - 1];
  if (typeof v === 'string') return v;
  return null;
}

export function buildDescendantsMap(
  nodes: Array<CatNode>,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  function collectDescendants(node: CatNode): Set<string> {
    const set = new Set<string>();
    if (node.children?.length) {
      for (const child of node.children) {
        set.add(child.id);
        for (const x of collectDescendants(child)) set.add(x);
      }
    }
    map.set(node.id, set);
    return set;
  }

  for (const n of nodes) collectDescendants(n);
  return map;
}
