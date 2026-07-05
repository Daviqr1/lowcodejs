import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import React from 'react';

import type { GanttGroup, GanttRow } from './gantt-types';
import { ROW_HEIGHT } from './gantt-types';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { IRow } from '@/lib/interfaces';
import { getUserInitials } from '@/lib/kanban-helpers';

type GanttLeftPanelProps = {
  groupedRows: Array<GanttGroup>;
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onRowClick: (row: IRow) => void;
  headerHeight: number;
};

export function GanttLeftPanel({
  groupedRows,
  collapsedGroups,
  onToggleGroup,
  onRowClick,
  headerHeight,
}: GanttLeftPanelProps): React.JSX.Element {
  return (
    <div
      data-slot="gantt-left-panel"
      data-test-id="gantt-left-panel"
      className="w-56 shrink-0 overflow-hidden border-r bg-background"
    >
      {/* Espaçador do header */}
      <div
        className="border-b bg-muted/30"
        style={{ height: headerHeight }}
      />

      <div>
        {groupedRows.map((group) => {
          const isCollapsed = collapsedGroups.has(group.option.id);
          return (
            <div key={group.option.id}>
              {/* Header do grupo */}
              <button
                type="button"
                className="flex w-full items-center gap-2 border-b bg-muted/40 px-3 text-xs font-semibold hover:bg-muted/60"
                style={{ height: ROW_HEIGHT }}
                onClick={() => onToggleGroup(group.option.id)}
              >
                {isCollapsed && (
                  <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground" />
                )}
                {!isCollapsed && (
                  <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground" />
                )}
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: group.option.color ?? '#9ca3af',
                  }}
                />
                <span className="truncate">{group.option.label}</span>
                <span className="ml-auto text-muted-foreground">
                  {group.rows.length}
                </span>
              </button>

              {/* Itens da row */}
              {!isCollapsed &&
                group.rows.map((ganttRow: GanttRow) => (
                  <button
                    key={ganttRow.row._id}
                    type="button"
                    className="flex w-full items-center gap-1.5 border-b px-3 text-left text-xs hover:bg-muted/30"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onRowClick(ganttRow.row)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {ganttRow.title}
                    </span>
                    {/* Avatares dos membros */}
                    {ganttRow.members.length > 0 && (
                      <div className="flex -space-x-1.5 shrink-0">
                        {ganttRow.members.slice(0, 2).map((member, i) => (
                          <Avatar
                            key={i}
                            className="size-5 border border-background"
                          >
                            <AvatarFallback className="text-[8px]">
                              {getUserInitials(member)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {ganttRow.members.length > 2 && (
                          <span className="ml-0.5 text-[10px] text-muted-foreground">
                            +{ganttRow.members.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
