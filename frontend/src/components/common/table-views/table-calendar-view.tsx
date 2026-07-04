import { useMutation } from '@tanstack/react-query';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { addMonths, addWeeks, subMonths, subWeeks } from 'date-fns';
import { PlusIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import {
  CalendarAgendaView,
  CalendarDeleteDialog,
  CalendarEventDialog,
  CalendarMonthView,
  CalendarToolbar,
  CalendarWeekView,
} from '@/components/common/calendar';
import type { CalendarViewMode } from '@/components/common/calendar';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useCreateTableRow } from '@/hooks/tanstack-query/use-table-row-create';
import { useUpdateTableRow } from '@/hooks/tanstack-query/use-table-row-update';
import { API } from '@/lib/api';
import {
  normalizeCalendarEvents,
  resolveCalendarFields,
} from '@/lib/calendar-helpers';
import type {
  CalendarEventItem,
  CalendarResolvedFields,
} from '@/lib/calendar-helpers';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRow, ITable } from '@/lib/interfaces';
import { isFieldShownInContext } from '@/lib/permission';
import { QueryClient } from '@/lib/query-client';
import { mountRowValue } from '@/lib/table';

interface Props {
  data: Array<IRow>;
  headers: Array<IField>;
  tableSlug: string;
  table: ITable;
}

export function TableCalendarView({
  data,
  headers,
  tableSlug,
  table,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  const [rowsState, setRowsState] = React.useState<Array<IRow>>(data);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [createDefaultStart, setCreateDefaultStart] =
    React.useState<Date | null>(null);

  React.useEffect(() => {
    setRowsState(data);
  }, [data]);

  // Deep-link: ?rowId=... abre o evento automaticamente.
  const searchParams = useRouterState({ select: (s) => s.location.search });
  const deepLinkRowIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    let rowIdParam: unknown;
    if (
      typeof searchParams === 'object' &&
      searchParams !== null &&
      'rowId' in searchParams
    ) {
      rowIdParam = searchParams.rowId;
    }
    if (typeof rowIdParam !== 'string' || !rowIdParam) return;
    if (deepLinkRowIdRef.current === rowIdParam) return;
    const exists = rowsState.some((row) => row._id === rowIdParam);
    if (!exists) return;
    deepLinkRowIdRef.current = rowIdParam;
    setEditingRowId(rowIdParam);
  }, [searchParams, rowsState]);

  const resolvedFields = React.useMemo(
    () => resolveCalendarFields(headers, table.layoutFields),
    [headers, table.layoutFields],
  );

  const extraFields = React.useMemo(() => {
    const baseFieldIds = new Set(
      [
        resolvedFields.titleField,
        resolvedFields.descriptionField,
        resolvedFields.startField,
        resolvedFields.endField,
        resolvedFields.colorField,
        resolvedFields.participantsField,
        resolvedFields.reminderField,
      ]
        .filter(Boolean)
        .map((f) => f!._id),
    );
    return table.fields.filter(
      (field) =>
        !field.trashed &&
        !field.native &&
        !baseFieldIds.has(field._id) &&
        isFieldShownInContext(field, 'form') &&
        field.type !== E_FIELD_TYPE.REACTION &&
        field.type !== E_FIELD_TYPE.EVALUATION,
    );
  }, [resolvedFields, table.fields]);

  const events = React.useMemo(
    () => normalizeCalendarEvents(rowsState, headers, table.layoutFields),
    [rowsState, headers, table.layoutFields],
  );
  const editingEvent = React.useMemo(
    () => events.find((item) => item.rowId === editingRowId) ?? null,
    [editingRowId, events],
  );

  const createRow = useCreateTableRow({
    onSuccess: (createdRow) => {
      setRowsState((prev) => [
        createdRow,
        ...prev.filter((r) => r._id !== createdRow._id),
      ]);
      setIsCreateOpen(false);
      toast.success('Agendamento criado com sucesso');
    },
    onError() {
      toast.error('Erro ao criar agendamento');
    },
  });

  const updateRow = useUpdateTableRow({
    onSuccess: (updatedRow) => {
      setRowsState((prev) =>
        prev.map((row) => {
          if (row._id === updatedRow._id) return updatedRow;
          return row;
        }),
      );
      setEditingRowId(null);
      toast.success('Agendamento atualizado com sucesso');
    },
    onError() {
      toast.error('Erro ao atualizar agendamento');
    },
  });

  const deleteRow = useMutation({
    mutationFn: async (rowId: string) => {
      await API.delete(`/tables/${tableSlug}/rows/${rowId}`);
      return rowId;
    },
    onSuccess: (rowId) => {
      setRowsState((prev) => prev.filter((row) => row._id !== rowId));
      setEditingRowId(null);
      setIsDeleteOpen(false);
      QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.detail(tableSlug, rowId),
      });
      QueryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(tableSlug),
      });
      toast.success('Agendamento excluído com sucesso');
    },
    onError() {
      toast.error('Erro ao excluir agendamento');
    },
  });

  const allExtraFields = React.useMemo(() => {
    const baseExtra: Array<IField> = [
      resolvedFields.participantsField,
      resolvedFields.reminderField,
    ].filter((f): f is IField => Boolean(f));
    return [...baseExtra, ...extraFields];
  }, [resolvedFields, extraFields]);

  const buildCalendarPayload = React.useCallback(
    (
      fieldsMap: CalendarResolvedFields,
      payload: {
        title: string;
        description: string;
        start: Date;
        end: Date;
        colorOptionId: string | null;
        extraValues: Record<string, unknown>;
      },
    ): Record<string, unknown> => {
      const dataPayload: Record<string, unknown> = {};

      if (fieldsMap.titleField)
        dataPayload[fieldsMap.titleField.slug] = payload.title;
      if (fieldsMap.descriptionField) {
        dataPayload[fieldsMap.descriptionField.slug] =
          payload.description || null;
      }
      if (fieldsMap.startField)
        dataPayload[fieldsMap.startField.slug] = payload.start.toISOString();
      if (fieldsMap.endField)
        dataPayload[fieldsMap.endField.slug] = payload.end.toISOString();
      if (fieldsMap.colorField) {
        const colorSlug = fieldsMap.colorField.slug;
        if (payload.colorOptionId)
          dataPayload[colorSlug] = [payload.colorOptionId];
        else dataPayload[colorSlug] = [];
      }

      for (const field of allExtraFields) {
        if (field.slug in payload.extraValues) {
          // extraValues e Record<string, unknown> (dados dinamicos do form);
          // mountRowValue espera FieldValue — cast forcado pelo valor runtime.
          dataPayload[field.slug] = mountRowValue(
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            payload.extraValues[field.slug] as Parameters<
              typeof mountRowValue
            >[0],
            field,
          );
        }
      }

      return dataPayload;
    },
    [allExtraFields],
  );

  const handleSelectEvent = React.useCallback((event: CalendarEventItem) => {
    setEditingRowId(event.rowId);
  }, []);

  const handlePrevious = React.useCallback(() => {
    setCurrentDate((value) => {
      if (viewMode === 'month') return subMonths(value, 1);
      return subWeeks(value, 1);
    });
  }, [viewMode]);

  const handleNext = React.useCallback(() => {
    setCurrentDate((value) => {
      if (viewMode === 'month') return addMonths(value, 1);
      return addWeeks(value, 1);
    });
  }, [viewMode]);

  const missingRequired =
    !resolvedFields.titleField ||
    !resolvedFields.startField ||
    !resolvedFields.endField;

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-test-id="table-calendar-view"
    >
      <CalendarToolbar
        currentDate={currentDate}
        viewMode={viewMode}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={() => setCurrentDate(new Date())}
        onChangeView={setViewMode}
        onSelectDate={setCurrentDate}
      />

      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="text-xs text-muted-foreground">
          {table.name} • clique em um agendamento para editar
        </div>
        {!missingRequired && (
          <Button
            type="button"
            size="sm"
            className="shadow-none"
            onClick={() => {
              setCreateDefaultStart(new Date());
              setIsCreateOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            <span>Novo agendamento</span>
          </Button>
        )}
      </div>

      {missingRequired && (
        <div className="p-4 text-sm text-muted-foreground">
          Campos obrigatórios do template Calendario não encontrados. Esperado:
          `titulo`, `data-inicio` e `data-termino`.
        </div>
      )}
      {!missingRequired && (
        <div className="min-h-0 flex-1">
          {viewMode === 'agenda' && (
            <CalendarAgendaView
              events={events}
              onSelectEvent={handleSelectEvent}
            />
          )}
          {viewMode === 'month' && (
            <CalendarMonthView
              currentDate={currentDate}
              events={events}
              onSelectEvent={handleSelectEvent}
            />
          )}
          {viewMode === 'week' && (
            <CalendarWeekView
              currentDate={currentDate}
              events={events}
              onSelectEvent={handleSelectEvent}
            />
          )}
        </div>
      )}

      {!missingRequired && (
        <CalendarEventDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          mode="create"
          fields={resolvedFields}
          event={null}
          defaultStartDate={createDefaultStart}
          isPending={createRow.status === 'pending'}
          extraFields={extraFields}
          tableSlug={tableSlug}
          table={table}
          onSubmit={async (payload) => {
            await createRow.mutateAsync({
              slug: tableSlug,
              data: buildCalendarPayload(resolvedFields, payload),
            });
          }}
        />
      )}

      {!missingRequired && editingEvent && (
        <CalendarEventDialog
          key={editingEvent.rowId}
          open
          onOpenChange={(open) => {
            if (!open) setEditingRowId(null);
          }}
          mode="edit"
          fields={resolvedFields}
          event={editingEvent}
          isPending={updateRow.status === 'pending'}
          extraFields={extraFields}
          tableSlug={tableSlug}
          table={table}
          onSubmit={async (payload) => {
            if (!editingEvent) return;
            await updateRow.mutateAsync({
              slug: tableSlug,
              rowId: editingEvent.rowId,
              data: buildCalendarPayload(resolvedFields, payload),
            });
          }}
          onDeleteClick={() => setIsDeleteOpen(true)}
          onOpenRecord={(row) => {
            router.navigate({
              to: '/tables/$slug/row/',
              params: { slug: tableSlug },
              search: { _id: row._id },
            });
          }}
        />
      )}

      <CalendarDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={editingEvent?.title}
        isPending={deleteRow.status === 'pending'}
        onConfirm={() => {
          if (!editingEvent) return;
          deleteRow.mutate(editingEvent.rowId);
        }}
      />
    </div>
  );
}
