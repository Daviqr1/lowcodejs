import type {
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  FolderTreeIcon,
  GripVerticalIcon,
  LoaderCircleIcon,
  TableIcon,
} from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMenuReadList } from '@/hooks/tanstack-query/use-menu-read-list';
import { useMenuReorder } from '@/hooks/tanstack-query/use-menu-reorder';
import { E_MENU_ITEM_TYPE } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { IMenu, ValueOf } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type DropMode = 'before' | 'after' | 'nest';
type ReorderScope = 'all' | 'root';

type MenuTreeNode = {
  menu: IMenu;
  children: Array<MenuTreeNode>;
};

type MenuReorderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SortableMenuNodeProps = {
  node: MenuTreeNode;
  level: number;
  parentId: string | null;
  dropMode: DropMode | null;
  children?: React.ReactNode;
};

const TypeMapper: Record<ValueOf<typeof E_MENU_ITEM_TYPE>, string> = {
  [E_MENU_ITEM_TYPE.PAGE]: 'Página',
  [E_MENU_ITEM_TYPE.TABLE]: 'Tabela',
  [E_MENU_ITEM_TYPE.FORM]: 'Formulário',
  [E_MENU_ITEM_TYPE.EXTERNAL]: 'Link',
  [E_MENU_ITEM_TYPE.SEPARATOR]: 'Separador',
  [E_MENU_ITEM_TYPE.EXTENSION_MODULE]: 'Módulo',
};

function getParentId(menu: IMenu): string | null {
  if (!menu.parent) return null;
  if (typeof menu.parent === 'string') return menu.parent;
  return menu.parent._id;
}

function sortByPosition<T extends { menu: IMenu }>(nodes: Array<T>): Array<T> {
  return [...nodes].sort((a, b) => {
    const orderDiff = (a.menu.order ?? 0) - (b.menu.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.menu.name.localeCompare(b.menu.name);
  });
}

function buildTree(menus: Array<IMenu>): Array<MenuTreeNode> {
  const menuIds = new Set(menus.map((menu) => menu._id));
  const nodeById = new Map<string, MenuTreeNode>();
  const childrenByParent = new Map<string | null, Array<MenuTreeNode>>();

  for (const menu of menus) {
    nodeById.set(menu._id, { menu, children: [] });
  }

  for (const node of nodeById.values()) {
    const parentId = getParentId(node.menu);
    let groupKey: string | null = null;
    if (parentId && menuIds.has(parentId)) groupKey = parentId;
    const siblings = childrenByParent.get(groupKey) ?? [];

    siblings.push(node);
    childrenByParent.set(groupKey, siblings);
  }

  for (const [parentId, children] of childrenByParent.entries()) {
    const orderedChildren = sortByPosition(children);
    childrenByParent.set(parentId, orderedChildren);

    if (parentId) {
      const parentNode = nodeById.get(parentId);
      if (parentNode) parentNode.children = orderedChildren;
    }
  }

  return childrenByParent.get(null) ?? [];
}

function findNodeById(
  nodes: Array<MenuTreeNode>,
  nodeId: string,
): MenuTreeNode | null {
  for (const node of nodes) {
    if (node.menu._id === nodeId) return node;
    const found = findNodeById(node.children, nodeId);
    if (found) return found;
  }

  return null;
}

function findParentIdByNodeId(
  nodes: Array<MenuTreeNode>,
  nodeId: string,
  parentId: string | null = null,
): string | null | undefined {
  for (const node of nodes) {
    if (node.menu._id === nodeId) return parentId;

    const found = findParentIdByNodeId(node.children, nodeId, node.menu._id);
    if (found !== undefined) return found;
  }

  return undefined;
}

function findAndRemove(
  nodes: Array<MenuTreeNode>,
  nodeId: string,
): { updated: Array<MenuTreeNode>; removed: MenuTreeNode | null } {
  let removed: MenuTreeNode | null = null;
  const updated = nodes
    .map((node) => {
      if (node.menu._id === nodeId) {
        removed = node;
        return null;
      }

      const result = findAndRemove(node.children, nodeId);
      if (result.removed) {
        removed = result.removed;
        return { ...node, children: result.updated };
      }

      return node;
    })
    .filter((node): node is MenuTreeNode => node !== null);

  return { updated, removed };
}

function insertNodeAt(
  nodes: Array<MenuTreeNode>,
  parentId: string | null,
  index: number,
  node: MenuTreeNode,
): Array<MenuTreeNode> {
  if (!parentId) {
    const next = [...nodes];
    next.splice(index, 0, node);
    return next;
  }

  return nodes.map((item) => {
    if (item.menu._id === parentId) {
      const children = [...item.children];
      children.splice(index, 0, node);
      return { ...item, children };
    }

    return {
      ...item,
      children: insertNodeAt(item.children, parentId, index, node),
    };
  });
}

function isDescendant(
  nodes: Array<MenuTreeNode>,
  nodeId: string,
  possibleDescendantId: string,
): boolean {
  const root = findNodeById(nodes, nodeId);
  if (!root) return false;

  function walk(children: Array<MenuTreeNode>): boolean {
    for (const child of children) {
      if (child.menu._id === possibleDescendantId) return true;
      if (walk(child.children)) return true;
    }

    return false;
  }

  return walk(root.children);
}

function flattenPayload(
  nodes: Array<MenuTreeNode>,
  scope: ReorderScope,
): Array<{
  _id: string;
  parent: string | null;
  order: number;
}> {
  const items: Array<{ _id: string; parent: string | null; order: number }> =
    [];

  if (scope === 'root') {
    return nodes.map((node, order) => ({
      _id: node.menu._id,
      parent: null,
      order,
    }));
  }

  function append(children: Array<MenuTreeNode>, parent: string | null): void {
    children.forEach((node, order) => {
      items.push({ _id: node.menu._id, parent, order });
      append(node.children, node.menu._id);
    });
  }

  append(nodes, null);

  return items;
}

function getDropMode(
  event: DragOverEvent | DragEndEvent,
  allowNest: boolean,
): DropMode | null {
  const { active, over } = event;
  if (!over) return null;

  const activeRect =
    active.rect.current.translated ?? active.rect.current.initial;
  if (!activeRect) return null;

  const overRect = over.rect;
  const activeCenterY = activeRect.top + activeRect.height / 2;
  const activeCenterX = activeRect.left + activeRect.width / 2;
  const threshold = overRect.height * 0.3;

  if (allowNest && activeCenterX > overRect.left + overRect.width * 0.56) {
    return 'nest';
  }
  if (activeCenterY <= overRect.top + threshold) return 'before';
  if (activeCenterY >= overRect.top + overRect.height - threshold) {
    return 'after';
  }

  if (!allowNest) {
    if (activeCenterY < overRect.top + overRect.height / 2) return 'before';
    return 'after';
  }

  return 'nest';
}

function SortableMenuNode({
  node,
  level,
  parentId,
  dropMode,
  children,
}: SortableMenuNodeProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.menu._id,
    data: { parentId },
  });

  let opacity = 1;
  if (isDragging) opacity = 0.55;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity,
    marginLeft: `${level * 24}px`,
  };

  let DropIcon = FolderTreeIcon;
  let dropLabel = 'Soltar dentro';
  if (dropMode === 'before') {
    DropIcon = ArrowUpIcon;
    dropLabel = 'Soltar acima';
  } else if (dropMode === 'after') {
    DropIcon = ArrowDownIcon;
    dropLabel = 'Soltar abaixo';
  }

  return (
    <div className="space-y-1">
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'relative flex min-h-11 items-center gap-2 rounded-md border bg-background px-2 text-sm transition-colors',
          dropMode === 'nest' && 'border-primary/50 bg-primary/5',
          dropMode === 'before' && 'border-t-primary border-t-2',
          dropMode === 'after' && 'border-b-primary border-b-2',
        )}
      >
        <button
          type="button"
          className="inline-flex size-7 cursor-grab items-center justify-center rounded border text-muted-foreground active:cursor-grabbing"
          aria-label="Arrastar menu"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <span className="inline-flex size-7 items-center justify-center rounded bg-muted text-muted-foreground">
          {node.children.length > 0 && <FolderTreeIcon className="size-4" />}
          {node.children.length === 0 && <TableIcon className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{node.menu.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {node.menu.slug}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0"
        >
          {TypeMapper[node.menu.type] ?? node.menu.type}
        </Badge>
        {dropMode && (
          <span className="pointer-events-none absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded bg-background/90 px-2 py-1 text-xs text-primary shadow-sm">
            <DropIcon className="size-3" />
            {dropLabel}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function DragPreview({ node }: { node: MenuTreeNode }): React.JSX.Element {
  return (
    <div className="flex min-h-11 min-w-72 cursor-grabbing items-center gap-2 rounded-md border bg-background px-2 text-sm shadow-lg">
      <GripVerticalIcon className="size-4 text-muted-foreground" />
      <span className="truncate font-medium">{node.menu.name}</span>
    </div>
  );
}

export function MenuReorderDialog({
  open,
  onOpenChange,
}: MenuReorderDialogProps): React.JSX.Element {
  const { data: menus, status } = useMenuReadList({ enabled: open });
  const [scope, setScope] = React.useState<ReorderScope>('root');
  const [tree, setTree] = React.useState<Array<MenuTreeNode>>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [dragOverMode, setDragOverMode] = React.useState<DropMode | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  React.useEffect(() => {
    if (!open || !menus) return;
    setTree(buildTree(menus));
  }, [menus, open]);

  const reorder = useMenuReorder({
    onSuccess() {
      toast.success('Ordem salva', {
        description: 'A ordem dos menus foi atualizada',
      });
      onOpenChange(false);
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao ordenar menus' });
    },
  });

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent): void => {
    const { active, over } = event;
    if (!over) {
      setDragOverId(null);
      setDragOverMode(null);
      return;
    }

    const activeIdValue = String(active.id);
    const overId = String(over.id);
    const overParentId: string | null = over.data.current?.parentId ?? null;

    if (
      isDescendant(tree, activeIdValue, overId) ||
      (overParentId && isDescendant(tree, activeIdValue, overParentId))
    ) {
      setDragOverId(null);
      setDragOverMode(null);
      return;
    }

    setDragOverId(overId);
    setDragOverMode(getDropMode(event, scope === 'all'));
  };

  const handleDragCancel = (_event: DragCancelEvent): void => {
    setActiveId(null);
    setDragOverId(null);
    setDragOverMode(null);
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverId(null);
    setDragOverMode(null);

    if (!over || active.id === over.id) return;

    const activeIdValue = String(active.id);
    const overId = String(over.id);
    const overParentId: string | null = over.data.current?.parentId ?? null;
    const mode = getDropMode(event, scope === 'all') ?? 'after';

    if (
      isDescendant(tree, activeIdValue, overId) ||
      (overParentId && isDescendant(tree, activeIdValue, overParentId))
    ) {
      return;
    }

    const { updated, removed } = findAndRemove(tree, activeIdValue);
    if (!removed) return;

    if (mode === 'nest') {
      const target = findNodeById(updated, overId);
      const childIndex = target?.children.length ?? 0;
      setTree(insertNodeAt(updated, overId, childIndex, removed));
      return;
    }

    const nextParentId = findParentIdByNodeId(updated, overId) ?? overParentId;
    let targetList = updated;
    if (nextParentId !== null) {
      targetList = findNodeById(updated, nextParentId)?.children ?? [];
    }
    const overIndex = targetList.findIndex((node) => node.menu._id === overId);
    let insertIndex = targetList.length;
    if (overIndex !== -1) {
      insertIndex = overIndex;
      if (mode === 'after') insertIndex = overIndex + 1;
    }

    setTree(insertNodeAt(updated, nextParentId, insertIndex, removed));
  };

  let activeNode = null;
  if (activeId) activeNode = findNodeById(tree, activeId);
  const isLoading = status === 'pending';
  const canRenderOverlay = typeof document !== 'undefined';
  const visibleTree = tree;

  const renderNodes = (
    nodes: Array<MenuTreeNode>,
    level: number,
    parentId: string | null,
  ): React.ReactNode => (
    <SortableContext
      items={nodes.map((node) => node.menu._id)}
      strategy={verticalListSortingStrategy}
    >
      {nodes.map((node) => {
        let nodeDropMode: DropMode | null = null;
        if (dragOverId === node.menu._id) nodeDropMode = dragOverMode;

        return (
          <SortableMenuNode
            key={node.menu._id}
            node={node}
            level={level}
            parentId={parentId}
            dropMode={nodeDropMode}
          >
            {node.children.length > 0 &&
              renderNodes(node.children, level + 1, node.menu._id)}
          </SortableMenuNode>
        );
      })}
    </SortableContext>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ordenar menu lateral</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-auto rounded-md border bg-muted/20 p-2">
          {isLoading && (
            <div className="flex min-h-48 items-center justify-center">
              <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && tree.length === 0 && (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              Nenhum menu encontrado
            </div>
          )}

          {!isLoading && tree.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="space-y-1">
                {scope === 'root' &&
                  renderNodes(
                    visibleTree.map((node) => ({ ...node, children: [] })),
                    0,
                    null,
                  )}
                {scope !== 'root' && renderNodes(visibleTree, 0, null)}
              </div>
              {canRenderOverlay &&
                createPortal(
                  <DragOverlay>
                    {activeNode && <DragPreview node={activeNode} />}
                  </DragOverlay>,
                  document.body,
                )}
            </DndContext>
          )}
        </div>

        <DialogFooter>
          <div className="mr-auto inline-flex rounded-md border bg-background p-1">
            <Button
              type="button"
              variant={(scope === 'root' && 'secondary') || 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setScope('root')}
              disabled={reorder.isPending}
            >
              Raiz
            </Button>
            <Button
              type="button"
              variant={(scope === 'all' && 'secondary') || 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setScope('all')}
              disabled={reorder.isPending}
            >
              Todos
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (menus) setTree(buildTree(menus));
            }}
            disabled={reorder.isPending || isLoading}
          >
            Restaurar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reorder.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() =>
              reorder.mutate({ items: flattenPayload(tree, scope) })
            }
            disabled={reorder.isPending || isLoading || tree.length === 0}
          >
            {reorder.isPending && (
              <LoaderCircleIcon className="size-4 animate-spin" />
            )}
            <span>Salvar ordem</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
