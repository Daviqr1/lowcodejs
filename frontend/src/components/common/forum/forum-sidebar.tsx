import {
  AtSignIcon,
  LockIcon,
  MessageCircle,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';

import type { IField, IRow } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type ForumSidebarProps = {
  rows: Array<IRow>;
  activeRowId: string | null;
  channelField?: IField | null;
  canAddChannel: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onAddChannel: () => void;
  onSelectRow: (rowId: string) => void;
  canAccessRow: (row: IRow) => boolean;
  canManageRow: (row: IRow) => boolean;
  onEditRow: (row: IRow) => void;
  onDeleteRow: (row: IRow) => void;
  mentionCountByRowId?: Record<string, number>;
};

export function ForumSidebar({
  rows,
  activeRowId,
  channelField,
  canAddChannel,
  isOpen,
  onToggleOpen,
  onAddChannel,
  onSelectRow,
  canAccessRow,
  canManageRow,
  onEditRow,
  onDeleteRow,
  mentionCountByRowId = {},
}: ForumSidebarProps): React.JSX.Element {
  return (
    <aside
      data-slot="forum-sidebar"
      data-test-id="forum-sidebar"
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 bg-background border-r h-svh flex flex-col relative md:sticky md:top-0 md:h-full md:inset-auto md:z-0',
        'transition-all duration-300',
        isOpen && 'w-64',
        !isOpen && 'w-10',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between px-2 py-2',
          isOpen && 'border-b',
        )}
      >
        {isOpen && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <MessageCircle className="size-4" />
              <span>Canais</span>
            </div>
            <div className="flex items-center gap-1">
              {canAddChannel && (
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted/60 cursor-pointer"
                  onClick={onAddChannel}
                  aria-label="Adicionar canal"
                >
                  <PlusIcon className="size-4" />
                </button>
              )}
              <button
                onClick={onToggleOpen}
                className="p-1 rounded hover:bg-muted/60 cursor-pointer"
                aria-label="Ocultar sidebar"
              >
                <PanelLeftCloseIcon className="size-5" />
              </button>
            </div>
          </>
        )}
        {!isOpen && (
          <button
            onClick={onToggleOpen}
            className="p-1 rounded hover:bg-muted/60 cursor-pointer mx-auto"
            aria-label="Mostrar sidebar"
          >
            <PanelLeftOpenIcon className="size-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 overflow-auto space-y-1 px-3 pb-3 pt-2">
          {rows.map((row) => {
            let label = row._id;
            if (channelField) {
              label = String(row[channelField.slug] ?? 'Canal sem nome');
            }
            const isActive = row._id === activeRowId;
            const canAccess = canAccessRow(row);
            const canManage = canManageRow(row);
            const mentionCount = mentionCountByRowId[row._id] ?? 0;
            return (
              <button
                key={row._id}
                type="button"
                className={cn(
                  'group w-full flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors cursor-pointer',
                  isActive && 'bg-muted text-foreground',
                  !isActive &&
                    'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                onClick={() => onSelectRow(row._id)}
              >
                {canAccess && <span className="font-medium">#</span>}
                {!canAccess && <LockIcon className="size-3.5" />}
                <span className="truncate">{label}</span>
                {mentionCount > 0 && (
                  <span className="ml-auto inline-flex items-center gap-1">
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <AtSignIcon className="size-2.5" />
                    </span>
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {mentionCount > 99 && '99+'}
                      {mentionCount <= 99 && mentionCount}
                    </span>
                  </span>
                )}
                {canManage && (
                  <span
                    className={cn(
                      'flex items-center gap-1 opacity-0 transition pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto',
                      mentionCount > 0 && 'ml-1',
                      mentionCount <= 0 && 'ml-auto',
                    )}
                  >
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted/60 cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditRow(row);
                      }}
                      aria-label="Editar canal"
                    >
                      <PencilIcon className="size-3" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted/60 cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteRow(row);
                      }}
                      aria-label="Excluir canal"
                    >
                      <TrashIcon className="size-3" />
                    </button>
                  </span>
                )}
              </button>
            );
          })}
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum canal criado.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
