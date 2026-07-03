import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import type { CatNode } from '@/lib/document-helpers';

export type DropMode = 'before' | 'after' | 'nest' | null;

export function buildParentMap(
  nodes: Array<CatNode>,
  parentId: string | null,
  map: Map<string, string | null>,
): Map<string, string | null> {
  for (const n of nodes) {
    map.set(n.id, parentId);
    if (n.children?.length) buildParentMap(n.children, n.id, map);
  }
  return map;
}

export function getAncestors(
  id: string,
  parentMap: Map<string, string | null>,
): Array<string> {
  const out: Array<string> = [];
  let cur: string | null | undefined = id;
  while (cur) {
    const p = parentMap.get(cur);
    if (!p) break;
    out.push(p);
    cur = p;
  }
  return out;
}

export function findNodeByIdLocal(
  nodes: Array<CatNode>,
  nodeId: string,
): CatNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (node.children?.length) {
      const found = findNodeByIdLocal(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

export function findNodeAndRemove(
  nodes: Array<CatNode>,
  nodeId: string,
): { updated: Array<CatNode>; removed: CatNode | null } {
  let removed: CatNode | null = null;
  const updated = nodes
    .map((node) => {
      if (node.id === nodeId) {
        removed = node;
        return null;
      }
      if (node.children?.length) {
        const result = findNodeAndRemove(node.children, nodeId);
        if (result.removed) {
          removed = result.removed;
          return { ...node, children: result.updated };
        }
      }
      return node;
    })
    .filter((node): node is CatNode => node !== null);
  return { updated, removed };
}

export function insertNodeAt(
  nodes: Array<CatNode>,
  parentId: string | null,
  index: number,
  node: CatNode,
): Array<CatNode> {
  if (!parentId) {
    const next = [...nodes];
    next.splice(index, 0, node);
    return next;
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      let children: NonNullable<typeof n.children> = [];
      if (n.children) children = [...n.children];
      children.splice(index, 0, node);
      return { ...n, children };
    }
    if (n.children?.length) {
      return {
        ...n,
        children: insertNodeAt(n.children, parentId, index, node),
      };
    }
    return n;
  });
}

export function reorderInTree(
  nodes: Array<CatNode>,
  parentId: string | null,
  activeId: string,
  overId: string,
): Array<CatNode> {
  if (!parentId) {
    const oldIndex = nodes.findIndex((node) => node.id === activeId);
    const newIndex = nodes.findIndex((node) => node.id === overId);
    if (oldIndex === -1 || newIndex === -1) return nodes;
    return arrayMove(nodes, oldIndex, newIndex);
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      const children = node.children ?? [];
      const oldIndex = children.findIndex((child) => child.id === activeId);
      const newIndex = children.findIndex((child) => child.id === overId);
      if (oldIndex === -1 || newIndex === -1) return node;
      return {
        ...node,
        children: arrayMove(children, oldIndex, newIndex),
      };
    }
    if (node.children?.length) {
      return {
        ...node,
        children: reorderInTree(node.children, parentId, activeId, overId),
      };
    }
    return node;
  });
}

export function updateNodeLabel(
  nodes: Array<CatNode>,
  nodeId: string,
  label: string,
): Array<CatNode> {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return { ...node, label };
    }
    if (node.children?.length) {
      return {
        ...node,
        children: updateNodeLabel(node.children, nodeId, label),
      };
    }
    return node;
  });
}

export function isDescendant(
  nodes: Array<CatNode>,
  nodeId: string,
  possibleDescendantId: string,
): boolean {
  const root = findNodeByIdLocal(nodes, nodeId);
  if (!root?.children?.length) return false;
  const has = (list: Array<CatNode>): boolean => {
    for (const n of list) {
      if (n.id === possibleDescendantId) return true;
      if (n.children?.length && has(n.children)) return true;
    }
    return false;
  };
  return has(root.children);
}

export function getDropMode(event: DragOverEvent | DragEndEvent): DropMode {
  const { active, over } = event;
  if (!over) return null;

  const activeRect = (active.rect.current.translated ??
    active.rect.current.initial)!;
  const overRect = over.rect;

  const overTop = overRect.top;
  const overBottom = overRect.top + overRect.height;
  const threshold = (overBottom - overTop) * 0.3;

  const activeCenterY = activeRect.top + activeRect.height / 2;
  const activeCenterX = activeRect.left + activeRect.width / 2;
  const rightNest = activeCenterX > overRect.left + overRect.width * 0.55;

  if (rightNest) return 'nest';
  if (activeCenterY <= overTop + threshold) return 'before';
  if (activeCenterY >= overBottom - threshold) return 'after';
  return 'nest';
}
