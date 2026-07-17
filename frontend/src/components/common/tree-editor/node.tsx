/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import type { TreeNode as TreeNodeType } from './use-tree';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TreeNodeProps = {
  node: TreeNodeType;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onAddNode?: (parentId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  allowAdd: boolean;
  isMulti: boolean;
  creationMode?: boolean;
};

export function TreeNodeComponent({
  node,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  onToggle,
  onSelect,
  onAddNode,
  onRemoveNode,
  allowAdd,
  isMulti,
  creationMode = false,
}: TreeNodeProps) {
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // No creation mode, apenas permite expansão/colapso, não seleção
    if (creationMode) {
      if (hasChildren) {
        onToggle(node.id);
      }
      return;
    }

    // Comportamento normal fora do creation mode
    if (hasChildren) {
      onToggle(node.id);
    }
    onSelect(node.id);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allowAdd) {
      onAddNode?.(node.id);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (creationMode) {
      onRemoveNode?.(node.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!creationMode && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(node.id);
    } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
      e.preventDefault();
      onToggle(node.id);
    } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
      e.preventDefault();
      onToggle(node.id);
    }
  };

  let expandCollapseIcon = <ChevronRight className="h-3 w-3" />;
  if (isExpanded) {
    expandCollapseIcon = <ChevronDown className="h-3 w-3" />;
  }

  let expandCollapseLabel = 'Expandir';
  if (isExpanded) {
    expandCollapseLabel = 'Recolher';
  }

  let checkboxClasses = 'border-input';
  if (isSelected) {
    checkboxClasses = 'bg-primary border-primary text-primary-foreground';
  }

  let ariaExpanded: boolean | undefined = undefined;
  if (hasChildren) {
    ariaExpanded = isExpanded;
  }

  return (
    <>
      <div
        data-slot="tree-node"
        className={cn(
          'flex items-center gap-2 py-2 px-3 transition-colors group',
          creationMode && 'hover:bg-orange-50',
          !creationMode && 'hover:bg-accent/50 cursor-pointer',
          'focus:outline-none focus:bg-accent/70',
          !creationMode &&
            isSelected &&
            'bg-primary/10 border-l-2 border-primary',
          creationMode && 'border-l-2 border-transparent',
        )}
        style={{ paddingLeft: `${12 + level * 20}px` }}
        onClick={handleNodeClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="option"
        aria-selected={!creationMode && isSelected}
        aria-expanded={ariaExpanded}
        aria-level={level + 1}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-4 w-4 hover:bg-transparent"
            onClick={handleToggleClick}
            aria-label={expandCollapseLabel}
          >
            {expandCollapseIcon}
          </Button>
        )}

        {!hasChildren && <div className="w-4" />}

        <div className="flex-1 flex items-center justify-between">
          <span
            className={cn(
              'text-sm truncate',
              creationMode && 'text-muted-foreground',
            )}
          >
            {node.label}
          </span>
          {creationMode && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              {allowAdd && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-6 w-6 hover:bg-orange-200 text-orange-600"
                  onClick={handleAddClick}
                  aria-label={`Adicionar item em ${node.label}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6 hover:bg-red-200 text-red-600"
                onClick={handleRemoveClick}
                aria-label={`Remover ${node.label}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {isMulti && !creationMode && (
          <div
            className={cn(
              'w-4 h-4 border-2 rounded-sm flex items-center justify-center',
              checkboxClasses,
            )}
          >
            {isSelected && <div className="w-2 h-2 bg-current rounded-sm" />}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && node.children && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={isSelected}
              isExpanded={isExpanded}
              hasChildren={hasChildren}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddNode={onAddNode}
              onRemoveNode={onRemoveNode}
              allowAdd={allowAdd}
              isMulti={isMulti}
              creationMode={creationMode}
            />
          ))}
        </div>
      )}
    </>
  );
}
