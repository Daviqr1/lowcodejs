import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FilePlusIcon,
  FolderPlusIcon,
  FolderTreeIcon,
  GripVerticalIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WorkflowIcon,
} from 'lucide-react';
import React, { useRef } from 'react';

import type { DropMode } from './document-sidebar-helpers';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { CatNode } from '@/lib/document-helpers';
import { cn } from '@/lib/utils';

function TreeNodeItem({
  node,
  level,
  parentId,
  selectedId,
  onSelect,
  isOpen,
  toggleOpen,
  onAddChild,
  onCreateArticle,
  onDelete,
  canAdd,
  editingNodeId,
  editingLabel,
  onEditLabelChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  dragOverId,
  dragOverMode,
  children,
}: {
  node: CatNode;
  level: number;
  parentId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isOpen: boolean;
  toggleOpen: (id: string) => void;
  onAddChild?: (id: string) => void;
  onCreateArticle?: (id: string) => void;
  onDelete?: (id: string, label: string) => void;
  canAdd?: boolean;
  editingNodeId: string | null;
  editingLabel: string;
  onEditLabelChange: (value: string) => void;
  onStartEdit: (nodeId: string, label: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  dragOverId: string | null;
  dragOverMode: DropMode;
  children?: React.ReactNode;
}): React.JSX.Element {
  const hasChildren = !!node.children?.length;
  const showAdd = canAdd && onAddChild;
  const showMenu = canAdd;
  const showDrag = canAdd;
  const isEditing = editingNodeId === node.id;
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

  let expandAriaLabel = 'Expandir';
  if (isOpen) {
    expandAriaLabel = 'Recolher';
  }

  return (
    <div data-slot="document-sidebar-tree-node">
      <div
        ref={setNodeRef}
        className={cn(
          'w-full rounded-md px-2 py-1.5 text-sm transition',
          'group flex items-center gap-2',
          selectedId === node.id && 'bg-muted font-medium',
          selectedId !== node.id && 'hover:bg-muted/60',
          dragOverId === node.id &&
            dragOverMode === 'nest' &&
            'bg-primary/10 ring-1 ring-primary/30',
          dragOverId === node.id &&
            dragOverMode === 'before' &&
            'border-t-2 border-primary/60',
          dragOverId === node.id &&
            dragOverMode === 'after' &&
            'border-b-2 border-primary/60',
        )}
        style={{ paddingLeft: 8 + level * 12, ...style }}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => toggleOpen(node.id)}
            className="p-0.5 rounded hover:bg-background/60 cursor-pointer"
            aria-label={expandAriaLabel}
          >
            {isOpen && <ChevronDownIcon className="size-4 opacity-70" />}
            {!isOpen && <ChevronRightIcon className="size-4 opacity-70" />}
          </button>
        )}
        {!hasChildren && <span className="w-[22px]" />}

        {hasChildren && <FolderTreeIcon className="size-4 opacity-70" />}
        {!hasChildren && <WorkflowIcon className="size-4 opacity-70" />}

        {isEditing && (
          <Input
            value={editingLabel}
            onChange={(event) => onEditLabelChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSaveEdit();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                onCancelEdit();
              }
            }}
            onBlur={() => onSaveEdit()}
            className="h-7 flex-1"
            autoFocus
          />
        )}
        {!isEditing && (
          <button
            type="button"
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => onStartEdit(node.id, node.label)}
            className="flex-1 text-left truncate cursor-pointer"
            title={node.label}
          >
            {node.label}
          </button>
        )}

        {showDrag && (
          <button
            type="button"
            className="p-0.5 rounded hover:bg-background/60 cursor-grab active:cursor-grabbing opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label="Arrastar item"
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
          >
            <GripVerticalIcon className="size-4 opacity-70" />
          </button>
        )}

        {showAdd && (
          <button
            type="button"
            className="p-0.5 rounded hover:bg-background/60 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label="Adicionar sub-item"
            onClick={(event) => {
              event.stopPropagation();
              onAddChild(node.id);
            }}
          >
            <PlusIcon className="size-4 opacity-70" />
          </button>
        )}

        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-0.5 rounded hover:bg-background/60 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"
              aria-label="Ações da seção"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreVerticalIcon className="size-4 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuItem
                onSelect={() => onStartEdit(node.id, node.label)}
              >
                <PencilIcon className="size-4 opacity-70" />
                <span>Renomear</span>
              </DropdownMenuItem>
              {onAddChild && (
                <DropdownMenuItem onSelect={() => onAddChild(node.id)}>
                  <FolderPlusIcon className="size-4 opacity-70" />
                  <span>Criar subseção</span>
                </DropdownMenuItem>
              )}
              {onCreateArticle && (
                <DropdownMenuItem onSelect={() => onCreateArticle(node.id)}>
                  <FilePlusIcon className="size-4 opacity-70" />
                  <span>Criar artigo</span>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <React.Fragment>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(node.id, node.label)}
                  >
                    <Trash2Icon className="size-4" />
                    <span>Excluir</span>
                  </DropdownMenuItem>
                </React.Fragment>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {children}
    </div>
  );
}

export function DocumentSidebarTree({
  nodes,
  selectedId,
  onSelect,
  openMap,
  toggleOpen,
  level = 0,
  onAddChild,
  onCreateArticle,
  onDelete,
  canAdd = false,
  editingNodeId,
  editingLabel,
  onEditLabelChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  dragOverId,
  dragOverMode,
  parentId = null,
}: {
  nodes: Array<CatNode>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  openMap: Record<string, boolean>;
  toggleOpen: (id: string) => void;
  level?: number;
  onAddChild?: (id: string) => void;
  onCreateArticle?: (id: string) => void;
  onDelete?: (id: string, label: string) => void;
  canAdd?: boolean;
  editingNodeId: string | null;
  editingLabel: string;
  onEditLabelChange: (value: string) => void;
  onStartEdit: (nodeId: string, label: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  dragOverId: string | null;
  dragOverMode: DropMode;
  parentId?: string | null;
}): React.JSX.Element {
  const clickTimerRef = useRef<number | null>(null);

  const clearClickTimer = (): void => {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  };

  const handleItemClick = (id: string): void => {
    if (editingNodeId) return;
    clearClickTimer();
    clickTimerRef.current = window.setTimeout(() => {
      onSelect(id);
    }, 250);
  };

  const handleItemDoubleClick = (nodeId: string, label: string): void => {
    if (!canAdd) return;
    clearClickTimer();
    onStartEdit(nodeId, label);
  };

  const handleSelect = (id: string | null): void => {
    if (id) handleItemClick(id);
  };

  const handleDoubleClick = (nodeId: string, label: string): void => {
    handleItemDoubleClick(nodeId, label);
  };

  return (
    <SortableContext
      items={nodes.map((node) => node.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        data-slot="document-sidebar-tree"
        className="space-y-1"
      >
        {nodes.map((n) => {
          const hasChildren = !!n.children?.length;
          let isOpen = false;
          if (hasChildren) {
            isOpen = !!openMap[n.id];
          }
          return (
            <TreeNodeItem
              key={n.id}
              node={n}
              level={level}
              parentId={parentId}
              selectedId={selectedId}
              onSelect={handleSelect}
              isOpen={isOpen}
              toggleOpen={toggleOpen}
              onAddChild={onAddChild}
              onCreateArticle={onCreateArticle}
              onDelete={onDelete}
              canAdd={canAdd}
              editingNodeId={editingNodeId}
              editingLabel={editingLabel}
              onEditLabelChange={onEditLabelChange}
              onStartEdit={handleDoubleClick}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              dragOverId={dragOverId}
              dragOverMode={dragOverMode}
            >
              {hasChildren && isOpen && (
                <div className="mt-1">
                  <DocumentSidebarTree
                    nodes={n.children!}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    openMap={openMap}
                    toggleOpen={toggleOpen}
                    level={level + 1}
                    onAddChild={onAddChild}
                    onCreateArticle={onCreateArticle}
                    onDelete={onDelete}
                    canAdd={canAdd}
                    editingNodeId={editingNodeId}
                    editingLabel={editingLabel}
                    onEditLabelChange={onEditLabelChange}
                    onStartEdit={onStartEdit}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                    dragOverId={dragOverId}
                    dragOverMode={dragOverMode}
                    parentId={n.id}
                  />
                </div>
              )}
            </TreeNodeItem>
          );
        })}
      </div>
    </SortableContext>
  );
}
