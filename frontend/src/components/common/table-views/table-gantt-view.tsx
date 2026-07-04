import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  isWeekend,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import React from 'react';
import { toast } from 'sonner';

import { KanbanRowDialog } from '@/components/common/dynamic-table/kanban';
import {
  DAY_WIDTH,
  GanttBar,
  GanttLeftPanel,
  GanttTimelineHeader,
  GanttToolbar,
  ROW_HEIGHT,
  getBarStyle,
  getStatusLabel,
  parseDate,
  useBarDrag,
  useCreateDrag,
} from '@/components/common/gantt';
import type {
  GanttGroup,
  GanttRow,
  ZoomLevel,
} from '@/components/common/gantt';
import { useCreateTableRow } from '@/hooks/tanstack-query/use-table-row-create';
import { useUpdateTableRow } from '@/hooks/tanstack-query/use-table-row-update';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRow, ITable, IUser } from '@/lib/interfaces';
import {
  getFieldBySlug,
  getFirstFieldByType,
  getMembersFromRow,
  getProgressValue,
  getTitleValue,
} from '@/lib/kanban-helpers';
import type { FieldMap } from '@/lib/kanban-types';

interface Props {
  data: Array<IRow>;
  headers: Array<IField>;
  tableSlug: string;
  table: ITable;
}

export function TableGanttView({
  data,
  headers,
  tableSlug,
  table,
}: Props): React.JSX.Element {
  const [rowsState, setRowsState] = React.useState<Array<IRow>>(data);
  const [activeRow, setActiveRow] = React.useState<IRow | null>(null);
  const [zoom, setZoom] = React.useState<ZoomLevel>('week');
  const [viewStart, setViewStart] = React.useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [filterStatus, setFilterStatus] = React.useState<string | null>(null);
  const [filterMember, setFilterMember] = React.useState<string | null>(null);

  const timelineRef = React.useRef<HTMLDivElement>(null);
  const labelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setRowsState(data);
  }, [data]);

  const updateRow = useUpdateTableRow({
    onSuccess(updatedRow) {
      setRowsState((prev) =>
        prev.map((r) => {
          if (r._id === updatedRow._id) return updatedRow;
          return r;
        }),
      );
    },
    onError() {
      toast.error('Erro ao atualizar tarefa');
    },
  });

  const createRow = useCreateTableRow({
    onSuccess(newRow) {
      setRowsState((prev) => [newRow, ...prev]);
      setActiveRow(newRow);
      toast.success('Tarefa criada');
    },
    onError() {
      toast.error('Erro ao criar tarefa');
    },
  });

  // --- Resolução de campos ---
  const fields = React.useMemo<FieldMap>(() => {
    const listField =
      getFieldBySlug(headers, 'lista', E_FIELD_TYPE.DROPDOWN) ||
      getFirstFieldByType(headers, E_FIELD_TYPE.DROPDOWN);
    return {
      title:
        getFieldBySlug(headers, 'titulo', E_FIELD_TYPE.TEXT_SHORT) ||
        getFirstFieldByType(headers, E_FIELD_TYPE.TEXT_SHORT),
      description: getFieldBySlug(headers, 'descricao', E_FIELD_TYPE.TEXT_LONG),
      members: getFieldBySlug(headers, 'membros', E_FIELD_TYPE.USER),
      startDate: getFieldBySlug(headers, 'data-de-inicio', E_FIELD_TYPE.DATE),
      dueDate: getFieldBySlug(headers, 'data-de-vencimento', E_FIELD_TYPE.DATE),
      progress: getFieldBySlug(
        headers,
        'porcentagem-concluida',
        E_FIELD_TYPE.TEXT_SHORT,
      ),
      list: listField,
      labels: undefined,
      attachments:
        getFieldBySlug(headers, 'anexos', E_FIELD_TYPE.FIELD_GROUP) ||
        getFieldBySlug(headers, 'anexo', E_FIELD_TYPE.FILE),
      tasks: getFieldBySlug(headers, 'tarefas', E_FIELD_TYPE.FIELD_GROUP),
      comments: getFieldBySlug(
        headers,
        'comentarios',
        E_FIELD_TYPE.FIELD_GROUP,
      ),
    };
  }, [headers]);

  // Campo de dependência (RELATIONSHIP apontando para a mesma tabela)
  const dependencyField = React.useMemo(() => {
    return headers.find(
      (f) =>
        !f.trashed &&
        f.type === E_FIELD_TYPE.RELATIONSHIP &&
        f.relationship?.table?.slug === tableSlug,
    );
  }, [headers, tableSlug]);

  const listOptions = fields.list?.dropdown ?? [];

  // Membros únicos para filtro
  const allMembers = React.useMemo(() => {
    const memberMap = new Map<string, IUser>();
    for (const row of rowsState) {
      const members = getMembersFromRow(row, fields.members);
      for (const m of members) {
        if (typeof m === 'object' && m !== null && '_id' in m) {
          memberMap.set(m._id, m);
        }
      }
    }
    return Array.from(memberMap.values());
  }, [rowsState, fields.members]);

  // --- Construção das gantt rows ---
  const ganttRows = React.useMemo<Array<GanttRow>>(() => {
    return rowsState.map((row) => {
      let dependencyIds: Array<string> = [];
      if (dependencyField) {
        const raw = row[dependencyField.slug];
        if (Array.isArray(raw)) {
          dependencyIds = raw.map((item) => {
            if (typeof item === 'object' && item !== null) {
              return item._id ?? String(item);
            }
            return String(item);
          });
        } else if (raw && typeof raw === 'object' && '_id' in raw) {
          dependencyIds = [raw._id];
        }
      }

      let end = null;
      if (fields.dueDate) end = parseDate(row[fields.dueDate.slug]);
      let start = null;
      if (fields.startDate) start = parseDate(row[fields.startDate.slug]);
      const status = getStatusLabel(row, fields.list);
      const lastOptionId = listOptions[listOptions.length - 1]?.id;
      const isOverdue =
        end !== null &&
        end < startOfDay(new Date()) &&
        status?.id !== lastOptionId;

      return {
        row,
        title: getTitleValue(row, fields.title),
        start,
        end,
        status,
        members: getMembersFromRow(row, fields.members),
        progress: getProgressValue(row, fields.progress),
        dependencyIds,
        isOverdue,
      };
    });
  }, [rowsState, fields, dependencyField, listOptions]);

  // --- Filtros ---
  const filteredRows = React.useMemo(() => {
    let rows = ganttRows;
    if (filterStatus) {
      rows = rows.filter((r) => r.status?.id === filterStatus);
    }
    if (filterMember) {
      rows = rows.filter((r) =>
        r.members.some(
          (m) =>
            typeof m === 'object' &&
            m !== null &&
            '_id' in m &&
            m._id === filterMember,
        ),
      );
    }
    return rows;
  }, [ganttRows, filterStatus, filterMember]);

  // --- Agrupamento ---
  const groupedRows = React.useMemo<Array<GanttGroup>>(() => {
    const groups: Array<GanttGroup> = [];
    for (const option of listOptions) {
      groups.push({
        option,
        rows: filteredRows.filter((r) => r.status?.id === option.id),
      });
    }
    const unassigned = filteredRows.filter((r) => !r.status);
    if (unassigned.length > 0) {
      groups.push({
        option: { id: '__none__', label: 'Sem lista', color: '#9ca3af' },
        rows: unassigned,
      });
    }
    return groups;
  }, [filteredRows, listOptions]);

  // --- Timeline ---
  const viewEnd = React.useMemo(() => {
    switch (zoom) {
      case 'day':
        return addDays(viewStart, 30);
      case 'week':
        return addDays(viewStart, 90);
      case 'month':
        return addDays(viewStart, 365);
    }
  }, [viewStart, zoom]);

  const days = React.useMemo(
    () => eachDayOfInterval({ start: viewStart, end: subDays(viewEnd, 1) }),
    [viewStart, viewEnd],
  );

  const dayWidth = DAY_WIDTH[zoom];
  const totalWidth = days.length * dayWidth;
  let headerHeight = 48;
  if (zoom === 'month') headerHeight = 28;

  // Posição das barras helper
  const computeBarStyle = React.useCallback(
    (start: Date | null, end: Date | null) =>
      getBarStyle(start, end, viewStart, dayWidth, days.length),
    [viewStart, dayWidth, days.length],
  );

  // Marcador de hoje
  const todayOffset = React.useMemo(() => {
    const diff = differenceInDays(startOfDay(new Date()), viewStart);
    if (diff < 0 || diff >= days.length) return null;
    return diff * dayWidth + dayWidth / 2;
  }, [viewStart, days.length, dayWidth]);

  // Sincronizar scroll
  const handleTimelineScroll = React.useCallback(() => {
    if (timelineRef.current && labelRef.current) {
      labelRef.current.scrollTop = timelineRef.current.scrollTop;
    }
  }, []);

  // --- Navegação ---
  const handlePrev = (): void => {
    let amount = 90;
    if (zoom === 'day') amount = 7;
    if (zoom === 'week') amount = 30;
    setViewStart((d) => subDays(d, amount));
  };
  const handleNext = (): void => {
    let amount = 90;
    if (zoom === 'day') amount = 7;
    if (zoom === 'week') amount = 30;
    setViewStart((d) => addDays(d, amount));
  };
  const handleToday = (): void => setViewStart(startOfMonth(new Date()));

  // --- Colapsar grupos ---
  const toggleGroup = (groupId: string): void => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // --- Mapa de posições Y das rows (para dependências e drag vertical) ---
  const rowPositionMap = React.useMemo(() => {
    const map = new Map<
      string,
      { y: number; bar: { left: number; width: number } | null }
    >();
    let yOffset = 0;
    for (const group of groupedRows) {
      yOffset += ROW_HEIGHT;
      if (collapsedGroups.has(group.option.id)) continue;
      for (const ganttRow of group.rows) {
        map.set(ganttRow.row._id, {
          y: yOffset,
          bar: computeBarStyle(ganttRow.start, ganttRow.end),
        });
        yOffset += ROW_HEIGHT;
      }
    }
    return map;
  }, [groupedRows, collapsedGroups, computeBarStyle]);

  // Altura total do conteúdo
  const totalContentHeight = React.useMemo(() => {
    return groupedRows.reduce((acc, g) => {
      let groupBodyHeight = g.rows.length * ROW_HEIGHT;
      if (collapsedGroups.has(g.option.id)) groupBodyHeight = 0;
      return acc + ROW_HEIGHT + groupBodyHeight;
    }, 0);
  }, [groupedRows, collapsedGroups]);

  // Mapa de faixas Y dos grupos (para detectar drag entre grupos)
  const groupYRanges = React.useMemo(() => {
    const ranges: Array<{ optionId: string; yStart: number; yEnd: number }> =
      [];
    let y = 0;
    for (const group of groupedRows) {
      const groupStart = y;
      y += ROW_HEIGHT;
      if (!collapsedGroups.has(group.option.id)) {
        y += group.rows.length * ROW_HEIGHT;
      }
      ranges.push({ optionId: group.option.id, yStart: groupStart, yEnd: y });
    }
    return ranges;
  }, [groupedRows, collapsedGroups]);

  // --- Hooks de drag ---
  const handleBarDragCommit = React.useCallback(
    (
      rowId: string,
      updateData: Record<string, unknown>,
      optimistic: (prev: Array<IRow>) => Array<IRow>,
    ) => {
      setRowsState(optimistic);
      updateRow.mutate({ slug: tableSlug, rowId, data: updateData });
    },
    [tableSlug, updateRow],
  );

  const { dragState, dragDelta, dragDeltaY, handleBarMouseDown } = useBarDrag({
    dayWidth,
    fields,
    tableSlug,
    groupYRanges,
    rowPositionMap,
    onCommit: handleBarDragCommit,
  });

  const handleCreateDragCommit = React.useCallback(
    (payload: Record<string, unknown>) => {
      createRow.mutate({ slug: tableSlug, data: payload });
    },
    [tableSlug, createRow],
  );

  const { createDrag, handleTimelineMouseDown } = useCreateDrag({
    dayWidth,
    viewStart,
    fields,
    tableSlug,
    timelineRef,
    onCreate: handleCreateDragCommit,
  });

  // Estilo da barra durante o drag (posição visual)
  const getDraggedBarStyle = (
    ganttRow: GanttRow,
  ): { left: number; width: number } | null => {
    if (!dragState || dragState.rowId !== ganttRow.row._id) return null;
    if (!ganttRow.start) return null;

    const deltaDays = Math.round(dragDelta / dayWidth);
    let start = ganttRow.start;
    let end = ganttRow.end ?? ganttRow.start;

    switch (dragState.mode) {
      case 'move':
        start = addDays(dragState.originalStart, deltaDays);
        end = addDays(dragState.originalEnd, deltaDays);
        break;
      case 'resize-left':
        start = addDays(dragState.originalStart, deltaDays);
        if (start > end) start = end;
        break;
      case 'resize-right':
        end = addDays(dragState.originalEnd, deltaDays);
        if (end < start) end = start;
        break;
    }

    return computeBarStyle(start, end);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-test-id="table-gantt-view"
    >
      {/* Toolbar com filtros e zoom */}
      <GanttToolbar
        zoom={zoom}
        onZoomChange={setZoom}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterMember={filterMember}
        onFilterMemberChange={setFilterMember}
        listOptions={listOptions}
        allMembers={allMembers}
      />

      {/* Conteúdo principal */}
      <div className="flex min-h-0 flex-1">
        {/* Painel esquerdo - labels */}
        <div
          ref={labelRef}
          className="overflow-hidden"
        >
          <GanttLeftPanel
            groupedRows={groupedRows}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
            onRowClick={setActiveRow}
            headerHeight={headerHeight}
          />
        </div>

        {/* Painel direito - timeline */}
        <div
          ref={timelineRef}
          className="min-w-0 flex-1 overflow-auto"
          onScroll={handleTimelineScroll}
        >
          <div style={{ width: totalWidth, minWidth: '100%' }}>
            <GanttTimelineHeader
              days={days}
              dayWidth={dayWidth}
              zoom={zoom}
              headerHeight={headerHeight}
            />

            {/* Área das barras */}
            <div
              className="relative"
              data-gantt-rows
            >
              {/* Marcador de hoje */}
              {todayOffset !== null && (
                <div
                  className="absolute top-0 z-20 w-px bg-red-500"
                  style={{
                    left: todayOffset,
                    height: totalContentHeight || 200,
                  }}
                />
              )}

              {/* Listras de fim de semana */}
              {days.map((day, i) => {
                if (!isWeekend(day)) return null;
                return (
                  <div
                    key={i}
                    className="absolute top-0 bg-muted/20"
                    style={{
                      left: i * dayWidth,
                      width: dayWidth,
                      height: totalContentHeight || 200,
                    }}
                  />
                );
              })}

              {/* Setas de dependência (SVG) */}
              <svg
                className="pointer-events-none absolute inset-0 z-10"
                width={totalWidth}
                height={totalContentHeight || 200}
              >
                <defs>
                  <marker
                    id="gantt-arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 8 3, 0 6"
                      className="fill-muted-foreground/60"
                    />
                  </marker>
                </defs>
                {filteredRows.map((ganttRow) => {
                  if (ganttRow.dependencyIds.length === 0) return null;
                  const target = rowPositionMap.get(ganttRow.row._id);
                  if (!target || !target.bar) return null;
                  const targetBar = target.bar;

                  return ganttRow.dependencyIds.map((depId) => {
                    const source = rowPositionMap.get(depId);
                    if (!source || !source.bar) return null;

                    const x1 = source.bar.left + source.bar.width;
                    const y1 = source.y + ROW_HEIGHT / 2;
                    const x2 = targetBar.left;
                    const y2 = target.y + ROW_HEIGHT / 2;
                    const midX = x1 + (x2 - x1) / 2;

                    return (
                      <path
                        key={`${depId}-${ganttRow.row._id}`}
                        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        className="stroke-muted-foreground/40"
                        strokeWidth={1.5}
                        markerEnd="url(#gantt-arrowhead)"
                      />
                    );
                  });
                })}
              </svg>

              {/* Preview do drag de criação */}
              {createDrag && (
                <div
                  className="absolute z-30 rounded-sm border-2 border-dashed border-primary/50 bg-primary/10"
                  style={{
                    left: Math.min(createDrag.startX, createDrag.currentX),
                    width: Math.abs(createDrag.currentX - createDrag.startX),
                    top: createDrag.rowTop,
                    height: createDrag.rowHeight,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Grupos e barras */}
              {groupedRows.map((group) => {
                const isCollapsed = collapsedGroups.has(group.option.id);
                return (
                  <div key={group.option.id}>
                    {/* Header do grupo */}
                    <div
                      className="border-b bg-muted/40"
                      style={{ height: ROW_HEIGHT }}
                    />

                    {/* Barras */}
                    {!isCollapsed &&
                      group.rows.map((ganttRow) => {
                        const isDragging =
                          dragState?.rowId === ganttRow.row._id;
                        let bar = computeBarStyle(ganttRow.start, ganttRow.end);
                        if (isDragging) bar = getDraggedBarStyle(ganttRow);
                        const barColor = ganttRow.status?.color ?? '#6b7280';
                        let cursor: string | undefined;
                        if (createDrag && !isDragging) cursor = 'crosshair';
                        let dragOffsetY = 0;
                        if (isDragging) dragOffsetY = dragDeltaY;

                        return (
                          <div
                            key={ganttRow.row._id}
                            className="relative border-b"
                            style={{
                              height: ROW_HEIGHT,
                              cursor,
                            }}
                            onMouseDown={(e) =>
                              handleTimelineMouseDown(e, group.option.id)
                            }
                          >
                            {bar && (
                              <GanttBar
                                ganttRow={ganttRow}
                                bar={bar}
                                barColor={barColor}
                                dayWidth={dayWidth}
                                rowHeight={ROW_HEIGHT}
                                isDragging={isDragging}
                                dragOffsetY={dragOffsetY}
                                onBarMouseDown={handleBarMouseDown}
                                onBarClick={() => setActiveRow(ganttRow.row)}
                              />
                            )}
                            {!bar && (
                              <div className="flex h-full items-center px-2">
                                <span className="text-[10px] text-muted-foreground italic">
                                  Sem datas
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de edição (reutiliza do Kanban) */}
      <KanbanRowDialog
        row={activeRow}
        onClose={() => setActiveRow(null)}
        onRowUpdated={(updatedRow) => {
          setRowsState((prev) =>
            prev.map((r) => {
              if (r._id === updatedRow._id) return updatedRow;
              return r;
            }),
          );
          setActiveRow(updatedRow);
        }}
        onRowDuplicated={(newRow) => {
          setRowsState((prev) => [newRow, ...prev]);
        }}
        onRowDeleted={(rowId) => {
          setRowsState((prev) => prev.filter((r) => r._id !== rowId));
          setActiveRow(null);
        }}
        tableSlug={tableSlug}
        table={table}
        fields={fields}
      />
    </div>
  );
}
