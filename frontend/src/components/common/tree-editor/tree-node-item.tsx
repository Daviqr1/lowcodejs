/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  FolderTree,
  GripVertical,
  Plus,
  Trash2,
  Workflow,
} from 'lucide-react';
import React from 'react';

import { InlineEditForm } from './inline-editor-form';
import type { TreeNode } from './tree-list';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TreeNodeItemProps = {
  node: TreeNode;
  level: number;
  isSelected: boolean;
  isEditing: boolean;
  dragMode?: boolean;
  dropMode?: 'before' | 'after' | 'nest' | null;
  onSelect: () => void;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onSaveEdit: (label: string) => void;
  onCancelEdit: () => void;
  children?: React.ReactNode;
  setNodeRef?: (element: HTMLDivElement | null) => void;
  style?: React.CSSProperties;
  dragAttributes?: React.HTMLAttributes<HTMLButtonElement>;
  dragListeners?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
};

export const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  isSelected,
  isEditing,
  dragMode = false,
  dropMode = null,
  onSelect,
  onEdit,
  onAddChild,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  children,
  setNodeRef,
  style,
  dragAttributes,
  dragListeners,
  isDragging,
}) => {
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragMode) return;
    onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (dragMode) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  let dataDragging: '' | undefined = undefined;
  if (isDragging) {
    dataDragging = '';
  }

  let nodeIcon = <Workflow className="w-4 h-4" />;
  if (node.children?.length) {
    nodeIcon = <FolderTree className="w-4 h-4" />;
  }

  let dropIcon = <FolderTree className="w-3 h-3" />;
  if (dropMode === 'before') {
    dropIcon = <ArrowUp className="w-3 h-3" />;
  } else if (dropMode === 'after') {
    dropIcon = <ArrowDown className="w-3 h-3" />;
  }

  let dropLabel = 'Soltar abaixo';
  if (dropMode === 'nest') {
    dropLabel = 'Soltar aqui';
  } else if (dropMode === 'before') {
    dropLabel = 'Soltar acima';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={dataDragging}
      className="w-full"
    >
      <div
        data-slot="tree-node-item"
        data-test-id="tree-node-item"
        className={cn(
          'relative flex items-center gap-2 p-2 rounded-sm transition-colors cursor-pointer group',
          'hover:bg-accent text-sm',
          isSelected && 'bg-accent text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragMode && 'cursor-grab active:cursor-grabbing',
          dropMode === 'nest' && 'bg-primary/10 ring-1 ring-primary/30',
          dropMode === 'before' && 'border-t-2 border-primary/60',
          dropMode === 'after' && 'border-b-2 border-primary/60',
        )}
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={handleNodeClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="option"
        aria-selected={isSelected}
      >
        {isEditing && (
          <InlineEditForm
            initialValue={node.label}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
          />
        )}
        {!isEditing && (
          <>
            {dragMode && (
              <button
                type="button"
                className="h-8 w-8 sm:h-5 sm:w-5 p-0 inline-flex items-center justify-center cursor-grab active:cursor-grabbing"
                aria-label="Arrastar para reordenar"
                onClick={(e) => e.stopPropagation()}
                {...dragAttributes}
                {...dragListeners}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            {!dragMode && (
              <span className="inline-flex items-center justify-center w-5 h-5 opacity-70">
                {nodeIcon}
              </span>
            )}
            {dragMode && dropMode && (
              <>
                <span
                  className={cn(
                    'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1',
                    dropMode === 'nest' && 'text-primary',
                    dropMode === 'before' && 'text-primary',
                    dropMode === 'after' && 'text-primary',
                  )}
                >
                  {dropIcon}
                  {dropLabel}
                </span>
                <span
                  className={cn(
                    'pointer-events-none absolute right-1 top-1 bottom-1 w-[45%] rounded-sm border border-dashed border-muted-foreground/40',
                    dropMode === 'nest' &&
                      'border-emerald-500/70 bg-emerald-500/10',
                    dropMode === 'before' && 'border-primary/60 bg-primary/5',
                    dropMode === 'after' && 'border-primary/60 bg-primary/5',
                  )}
                />
                {dropMode === 'nest' && (
                  <span className="pointer-events-none absolute left-2 right-2 top-0.5 h-0.5 bg-emerald-500/60" />
                )}
                {dropMode === 'before' && (
                  <span className="pointer-events-none absolute left-2 right-2 top-0 h-0.5 bg-primary/60" />
                )}
                {dropMode === 'after' && (
                  <span className="pointer-events-none absolute left-2 right-2 bottom-0 h-0.5 bg-primary/60" />
                )}
              </>
            )}
            <span className="flex-1 truncate">{node.label}</span>
            {/* {!node.selectable && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Info
              </span>
            )} */}

            {!dragMode && (
              <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                {isSelected && (
                  <>
                    <Button
                      data-test-id="tree-node-edit-btn"
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="h-8 w-8 sm:h-6 sm:w-6 p-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild();
                      }}
                      className="h-8 w-8 sm:h-6 sm:w-6 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      data-test-id="tree-node-delete-btn"
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="h-8 w-8 sm:h-6 sm:w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {children && <div className="ml-2">{children}</div>}
    </div>
  );
};
