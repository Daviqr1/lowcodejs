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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, Plus } from 'lucide-react';
import React, { useState } from 'react';

import { AddNodeForm } from './add-node-form';
import type { TreeNode } from './tree-list';
import { TreeNodeItem } from './tree-node-item';
import { useTreeEditor } from './use-tree-editor';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TreeEditorProps {
  initialData?: Array<TreeNode>;
  onChange?: (data: Array<TreeNode>) => void;
  className?: string;
}

interface SortableTreeNodeItemProps {
  node: TreeNode;
  level: number;
  parentId: string | null;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  dragMode: boolean;
  dropMode?: 'before' | 'after' | 'nest' | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onAddChild: () => void;
  onDelete: () => void;
  onSaveEdit: (id: string, label: string) => void;
  onCancelEdit: () => void;
  children?: React.ReactNode;
}

function SortableTreeNodeItem({
  node,
  level,
  parentId,
  selectedNodeId,
  editingNodeId,
  dragMode,
  dropMode,
  onSelect,
  onEdit,
  onAddChild,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  children,
}: SortableTreeNodeItemProps): React.JSX.Element {
  const isEditing = editingNodeId === node.id;
  const isSelected = selectedNodeId === node.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    data: { parentId },
    disabled: isEditing || !dragMode,
  });

  let transformStyle: string | undefined;
  if (isDragging) {
    transformStyle = CSS.Transform.toString(transform);
  }
  let transitionStyle: string | undefined;
  if (isDragging) {
    transitionStyle = transition;
  }
  let opacityStyle = 1;
  if (isDragging) {
    opacityStyle = 0.6;
  }

  const style = {
    transform: transformStyle,
    transition: transitionStyle,
    opacity: opacityStyle,
  };

  return (
    <TreeNodeItem
      node={node}
      level={level}
      isSelected={isSelected}
      isEditing={isEditing}
      dragMode={dragMode}
      dropMode={dropMode}
      onSelect={() => onSelect(node.id)}
      onEdit={() => onEdit(node.id)}
      onAddChild={onAddChild}
      onDelete={onDelete}
      onSaveEdit={(label) => onSaveEdit(node.id, label)}
      onCancelEdit={onCancelEdit}
      setNodeRef={setNodeRef}
      style={style}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
    >
      {children}
    </TreeNodeItem>
  );
}

export const TreeEditor: React.FC<TreeEditorProps> = ({
  initialData = [],
  onChange,
  className,
}) => {
  const [expandedView, setExpandedView] = useState(false);
  const [dragMode, setDragMode] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverMode, setDragOverMode] = useState<
    'before' | 'after' | 'nest' | null
  >(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const {
    treeData,
    selectedNodeId,
    editingNodeId,
    showAddForm,
    addFormType,
    setSelectedNodeId,
    generateId,
    findNodeById,
    handleAddRootNode,
    handleAddChildNode,
    handleSaveNewNode,
    handleCancelAdd,
    handleEditNode,
    handleSaveEdit,
    handleCancelEdit,
    handleDeleteNode,
    handleReorder,
  } = useTreeEditor(initialData, onChange);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findNodeAndRemove = (
    nodes: Array<TreeNode>,
    nodeId: string,
  ): { updated: Array<TreeNode>; removed: TreeNode | null } => {
    let removed: TreeNode | null = null;
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
      .filter((node): node is TreeNode => node !== null);
    return { updated, removed };
  };

  const findNodeByIdLocal = (
    nodes: Array<TreeNode>,
    nodeId: string,
  ): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children?.length) {
        const found = findNodeByIdLocal(node.children, nodeId);
        if (found) return found;
      }
    }
    return null;
  };

  const insertNodeAt = (
    nodes: Array<TreeNode>,
    parentId: string | null,
    index: number,
    node: TreeNode,
  ): Array<TreeNode> => {
    if (!parentId) {
      const next = [...nodes];
      next.splice(index, 0, node);
      return next;
    }
    return nodes.map((n) => {
      if (n.id === parentId) {
        let children: typeof n.children = [];
        if (n.children) {
          children = [...n.children];
        }
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
  };

  const isDescendant = (
    nodes: Array<TreeNode>,
    nodeId: string,
    possibleDescendantId: string,
  ): boolean => {
    const root = findNodeByIdLocal(nodes, nodeId);
    if (!root?.children?.length) return false;
    const has = (list: Array<TreeNode>): boolean => {
      for (const n of list) {
        if (n.id === possibleDescendantId) return true;
        if (n.children?.length && has(n.children)) return true;
      }
      return false;
    };
    return has(root.children);
  };

  const reorderInTree = (
    nodes: Array<TreeNode>,
    parentId: string | null,
    activeId: string,
    overId: string,
  ): Array<TreeNode> => {
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
  };

  const getDropMode = (
    event: DragOverEvent | DragEndEvent,
  ): 'before' | 'after' | 'nest' | null => {
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
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    if (!dragMode) return;
    const { active, over } = event;
    setDragOverId(null);
    setDragOverMode(null);
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const activeParentId: string | null = active.data.current?.parentId ?? null;
    const overParentId: string | null = over.data.current?.parentId ?? null;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (
      (overParentId && isDescendant(treeData, activeId, overParentId)) ||
      isDescendant(treeData, activeId, overId)
    ) {
      return;
    }

    const computedMode = getDropMode(event);
    const shouldNest = computedMode === 'nest';

    if (activeParentId === overParentId) {
      if (shouldNest) {
        if (activeId !== overId) {
          const { updated, removed } = findNodeAndRemove(treeData, activeId);
          if (!removed) return;
          const targetNode = findNodeByIdLocal(updated, overId);
          const childIndex = targetNode?.children?.length ?? 0;
          const next = insertNodeAt(updated, overId, childIndex, removed);
          handleReorder(next);
        }
        return;
      }

      const updated = reorderInTree(treeData, activeParentId, activeId, overId);
      handleReorder(updated);
      return;
    }

    const { updated, removed } = findNodeAndRemove(treeData, activeId);
    if (!removed) return;

    if (shouldNest) {
      const targetNode = findNodeByIdLocal(updated, overId);
      const childIndex = targetNode?.children?.length ?? 0;
      const next = insertNodeAt(updated, overId, childIndex, removed);
      handleReorder(next);
      return;
    }

    let targetList = updated;
    if (overParentId !== null) {
      targetList = findNodeByIdLocal(updated, overParentId)?.children ?? [];
    }
    const insertIndex = targetList.findIndex((item) => item.id === overId);
    let nextIndex = targetList.length;
    if (insertIndex !== -1) {
      nextIndex = insertIndex;
    }

    const next = insertNodeAt(updated, overParentId, nextIndex, removed);
    handleReorder(next);
  };

  const handleDragOver = (event: DragOverEvent): void => {
    if (!dragMode) return;
    const { active, over } = event;
    if (!over) {
      setDragOverId(null);
      setDragOverMode(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (
      isDescendant(treeData, activeId, overId) ||
      (over.data.current!.parentId &&
        isDescendant(treeData, activeId, String(over.data.current!.parentId)))
    ) {
      setDragOverId(null);
      setDragOverMode(null);
      return;
    }

    const mode = getDropMode(event);
    setDragOverId(overId);
    setDragOverMode(mode);
  };

  const handleDragCancel = (_event: DragCancelEvent): void => {
    setDragOverId(null);
    setDragOverMode(null);
    setActiveDragId(null);
  };

  const handleDragStart = (event: DragStartEvent): void => {
    if (!dragMode) return;
    setActiveDragId(String(event.active.id));
  };

  const renderNodeList = (
    nodes: Array<TreeNode>,
    level: number,
    parentId: string | null,
  ): React.ReactNode => {
    return (
      <SortableContext
        items={nodes.map((node) => node.id)}
        strategy={verticalListSortingStrategy}
      >
        {nodes.map((node) => {
          let nodeDropMode: 'before' | 'after' | 'nest' | null = null;
          if (dragOverId === node.id) {
            nodeDropMode = dragOverMode;
          }
          return (
            <SortableTreeNodeItem
              key={node.id}
              node={node}
              level={level}
              parentId={parentId}
              selectedNodeId={selectedNodeId}
              editingNodeId={editingNodeId}
              dragMode={dragMode}
              dropMode={nodeDropMode}
              onSelect={setSelectedNodeId}
              onEdit={handleEditNode}
              onAddChild={handleAddChildNode}
              onDelete={handleDeleteNode}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            >
              {(node.children?.length ?? 0) > 0 &&
                renderNodeList(node.children!, level + 1, node.id)}
            </SortableTreeNodeItem>
          );
        })}
      </SortableContext>
    );
  };

  let dragModeLabel = 'Ativar organizacao';
  if (dragMode) {
    dragModeLabel = 'Desativar organizacao';
  }

  return (
    <div
      data-slot="tree-editor"
      data-test-id="tree-node"
      className={cn('w-full', className)}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            onClick={handleAddRootNode}
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar
          </Button>
          <Button
            type="button"
            onClick={() => setExpandedView((prev) => !prev)}
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs ml-2 gap-1"
          >
            {expandedView && (
              <>
                <ChevronUp className="w-3 h-3" />
                Recolher
              </>
            )}
            {!expandedView && (
              <>
                <ChevronDown className="w-3 h-3" />
                Expandir
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={() => setDragMode((prev) => !prev)}
            size="sm"
            variant="outline"
            className={cn(
              'h-8 px-3 text-xs ml-2 gap-1',
              dragMode && 'border-primary text-primary',
            )}
            aria-label={dragModeLabel}
            title={dragModeLabel}
          >
            <GripVertical className="w-3 h-3" />
            Organizar
          </Button>
        </div>

        {showAddForm && (
          <AddNodeForm
            type={addFormType}
            parentNodeLabel={
              (selectedNodeId && findNodeById(treeData, selectedNodeId)?.label) ||
              undefined
            }
            onSave={handleSaveNewNode}
            onCancel={handleCancelAdd}
            generateId={generateId}
          />
        )}

        <div className="relative">
          {treeData.length > 0 && (
            <div className="rounded-md border bg-background text-sm shadow-sm">
              <div
                className={cn(
                  'overflow-y-auto p-1',
                  expandedView && 'max-h-none',
                  !expandedView && 'max-h-60',
                )}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragOver={handleDragOver}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  {renderNodeList(treeData, 0, null)}
                  <DragOverlay>
                    {activeDragId && (
                      <TreeNodeItem
                        node={
                          findNodeByIdLocal(treeData, activeDragId) ?? {
                            id: activeDragId,
                            label: '',
                          }
                        }
                        level={0}
                        isSelected={false}
                        isEditing={false}
                        dragMode={true}
                        onSelect={() => {}}
                        onEdit={() => {}}
                        onAddChild={() => {}}
                        onDelete={() => {}}
                        onSaveEdit={() => {}}
                        onCancelEdit={() => {}}
                      />
                    )}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          )}
          {treeData.length === 0 && (
            <div className="rounded-md border bg-background p-6 text-center text-sm text-muted-foreground">
              <div className="space-y-1">
                <p>Nenhum item selecionado</p>
                <p className="text-xs">Clique em "Adicionar" para começar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
