import { addDays } from 'date-fns';
import React from 'react';

import type {
  CreateDragState,
  DragMode,
  DragState,
  GanttRow,
  GroupYRange,
} from './gantt-types';
import { ROW_HEIGHT } from './gantt-types';

import type { IRow } from '@/lib/interfaces';
import type { FieldMap } from '@/lib/kanban-types';

// ─── Hook: drag de barras (mover, resize, troca de grupo) ───

type UseBarDragOptions = {
  dayWidth: number;
  fields: FieldMap;
  tableSlug: string;
  groupYRanges: Array<GroupYRange>;
  rowPositionMap: Map<
    string,
    { y: number; bar: { left: number; width: number } | null }
  >;
  onCommit: (
    rowId: string,
    updateData: Record<string, unknown>,
    optimistic: (prev: Array<IRow>) => Array<IRow>,
  ) => void;
};

type UseBarDragReturn = {
  dragState: DragState | null;
  dragDelta: number;
  dragDeltaY: number;
  handleBarMouseDown: (
    e: React.MouseEvent,
    ganttRow: GanttRow,
    mode: DragMode,
  ) => void;
};

export function useBarDrag({
  dayWidth,
  fields,
  tableSlug,
  groupYRanges,
  rowPositionMap,
  onCommit,
}: UseBarDragOptions): UseBarDragReturn {
  const [dragState, setDragState] = React.useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = React.useState(0);
  const [dragDeltaY, setDragDeltaY] = React.useState(0);
  const dragDeltaRef = React.useRef(0);
  const dragDeltaYRef = React.useRef(0);

  const handleBarMouseDown = (
    e: React.MouseEvent,
    ganttRow: GanttRow,
    mode: DragMode,
  ): void => {
    if (!ganttRow.start) return;
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      rowId: ganttRow.row._id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      originalStart: ganttRow.start,
      originalEnd: ganttRow.end ?? ganttRow.start,
      originalGroupId: ganttRow.status?.id ?? null,
    });
    setDragDelta(0);
    setDragDeltaY(0);
  };

  React.useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent): void => {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      dragDeltaRef.current = deltaX;
      dragDeltaYRef.current = deltaY;
      setDragDelta(deltaX);
      setDragDeltaY(deltaY);
    };

    const handleMouseUp = (): void => {
      const deltaDays = Math.round(dragDeltaRef.current / dayWidth);
      const deltaY = dragDeltaYRef.current;
      const hasDateChange = deltaDays !== 0;

      // Detectar mudança vertical de grupo (só no modo 'move')
      let newGroupId: string | null = null;
      if (dragState.mode === 'move' && fields.list) {
        const currentPos = rowPositionMap.get(dragState.rowId);
        if (currentPos) {
          const targetY = currentPos.y + deltaY + ROW_HEIGHT / 2;
          for (const range of groupYRanges) {
            if (targetY >= range.yStart && targetY < range.yEnd) {
              if (
                range.optionId !== (dragState.originalGroupId ?? '__none__')
              ) {
                newGroupId = range.optionId;
              }
              break;
            }
          }
        }
      }

      const hasGroupChange = newGroupId !== null;

      if (hasDateChange || hasGroupChange) {
        let newStart: Date;
        let newEnd: Date;

        switch (dragState.mode) {
          case 'move':
            newStart = addDays(dragState.originalStart, deltaDays);
            newEnd = addDays(dragState.originalEnd, deltaDays);
            break;
          case 'resize-left':
            newStart = addDays(dragState.originalStart, deltaDays);
            newEnd = dragState.originalEnd;
            if (newStart > newEnd) newStart = newEnd;
            break;
          case 'resize-right':
            newStart = dragState.originalStart;
            newEnd = addDays(dragState.originalEnd, deltaDays);
            if (newEnd < newStart) newEnd = newStart;
            break;
        }

        const updateData: Record<string, unknown> = {};
        if (fields.startDate)
          updateData[fields.startDate.slug] = newStart!.toISOString();
        if (fields.dueDate)
          updateData[fields.dueDate.slug] = newEnd!.toISOString();
        if (hasGroupChange && fields.list) {
          if (newGroupId === '__none__') updateData[fields.list.slug] = [];
          else updateData[fields.list.slug] = [newGroupId];
        }

        const optimistic = (prev: Array<IRow>): Array<IRow> =>
          prev.map((r) => {
            if (r._id !== dragState.rowId) return r;
            const updated = { ...r };
            if (fields.startDate)
              updated[fields.startDate.slug] = newStart!.toISOString();
            if (fields.dueDate)
              updated[fields.dueDate.slug] = newEnd!.toISOString();
            if (hasGroupChange && fields.list) {
              let listValue: Array<string> = [];
              if (newGroupId !== '__none__' && typeof newGroupId === 'string') {
                listValue = [newGroupId];
              }
              updated[fields.list.slug] = listValue;
            }
            return updated;
          });

        onCommit(dragState.rowId, updateData, optimistic);
      }

      setDragState(null);
      setDragDelta(0);
      setDragDeltaY(0);
      dragDeltaRef.current = 0;
      dragDeltaYRef.current = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return (): void => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragState,
    dayWidth,
    fields,
    tableSlug,
    groupYRanges,
    rowPositionMap,
    onCommit,
  ]);

  return { dragState, dragDelta, dragDeltaY, handleBarMouseDown };
}

// ─── Hook: criar tarefa arrastando no timeline ───

type UseCreateDragOptions = {
  dayWidth: number;
  viewStart: Date;
  fields: FieldMap;
  tableSlug: string;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  onCreate: (payload: Record<string, unknown>) => void;
};

type UseCreateDragReturn = {
  createDrag: CreateDragState | null;
  handleTimelineMouseDown: (e: React.MouseEvent, groupOptionId: string) => void;
};

export function useCreateDrag({
  dayWidth,
  viewStart,
  fields,
  tableSlug,
  timelineRef,
  onCreate,
}: UseCreateDragOptions): UseCreateDragReturn {
  const [createDrag, setCreateDrag] = React.useState<CreateDragState | null>(
    null,
  );

  const handleTimelineMouseDown = (
    e: React.MouseEvent,
    groupOptionId: string,
  ): void => {
    if (e.target instanceof HTMLElement && e.target.closest('[data-gantt-bar]'))
      return;
    if (!fields.startDate || !fields.dueDate) return;
    if (!(e.currentTarget instanceof HTMLElement)) return;

    const rowEl = e.currentTarget;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left + (timelineRef.current?.scrollLeft ?? 0);

    const rowsContainer = rowEl.closest('[data-gantt-rows]');
    let rowTop = rowEl.offsetTop;
    if (rowsContainer) {
      rowTop =
        rowEl.getBoundingClientRect().top -
        rowsContainer.getBoundingClientRect().top;
    }

    setCreateDrag({
      groupOptionId,
      startX: x,
      currentX: x,
      timelineLeft: rect.left - (timelineRef.current?.scrollLeft ?? 0),
      rowTop,
      rowHeight: ROW_HEIGHT,
    });
  };

  React.useEffect(() => {
    if (!createDrag) return;

    const handleMouseMove = (e: MouseEvent): void => {
      const scrollLeft = timelineRef.current?.scrollLeft ?? 0;
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left + scrollLeft;
      setCreateDrag((prev) => {
        if (prev) return { ...prev, currentX: x };
        return null;
      });
    };

    const handleMouseUp = (): void => {
      if (!createDrag || !fields.startDate || !fields.dueDate) {
        setCreateDrag(null);
        return;
      }

      const minX = Math.min(createDrag.startX, createDrag.currentX);
      const maxX = Math.max(createDrag.startX, createDrag.currentX);

      if (maxX - minX < dayWidth / 2) {
        setCreateDrag(null);
        return;
      }

      const startDayIndex = Math.floor(minX / dayWidth);
      const endDayIndex = Math.floor(maxX / dayWidth);

      const payload: Record<string, unknown> = {};
      payload[fields.startDate.slug] = addDays(
        viewStart,
        startDayIndex,
      ).toISOString();
      payload[fields.dueDate.slug] = addDays(
        viewStart,
        endDayIndex,
      ).toISOString();

      if (fields.title) payload[fields.title.slug] = 'Nova tarefa';

      if (
        fields.list &&
        createDrag.groupOptionId &&
        createDrag.groupOptionId !== '__none__'
      ) {
        payload[fields.list.slug] = [createDrag.groupOptionId];
      }

      onCreate(payload);
      setCreateDrag(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return (): void => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    createDrag,
    dayWidth,
    viewStart,
    fields,
    tableSlug,
    timelineRef,
    onCreate,
  ]);

  return { createDrag, handleTimelineMouseDown };
}
