import {
  addMinutes,
  compareAsc,
  format,
  isSameDay,
  isValid,
  startOfDay,
} from 'date-fns';

import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, ILayoutFields, IRow, ITable } from '@/lib/interfaces';
import { getFieldBySlug, getFirstFieldByType } from '@/lib/kanban-helpers';
import { resolveLayoutField } from '@/lib/layout-field-resolver';

const DEFAULT_EVENT_COLOR = '#2563eb';

export interface CalendarResolvedFields {
  titleField?: IField;
  descriptionField?: IField;
  startField?: IField;
  endField?: IField;
  colorField?: IField;
  participantsField?: IField;
  reminderField?: IField;
}

export interface CalendarEventItem {
  row: IRow;
  rowId: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  color: string;
  colorLabel: string | null;
  participants: Array<{ _id: string; name: string }>;
}

function firstValue(value: unknown): unknown {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return String(value[0] ?? '');
  if (isRecord(value)) {
    return String(value.label ?? value.name ?? value.value ?? '');
  }
  return String(value);
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveCalendarFields(
  fields: Array<IField>,
  layoutFields?: ILayoutFields | null,
): CalendarResolvedFields {
  const startField =
    resolveLayoutField(fields, layoutFields, 'startDate') ??
    getFieldBySlug(fields, 'data-inicio', E_FIELD_TYPE.DATE) ??
    getFirstFieldByType(fields, E_FIELD_TYPE.DATE);

  const resolvedEnd =
    resolveLayoutField(fields, layoutFields, 'endDate') ??
    getFieldBySlug(fields, 'data-termino', E_FIELD_TYPE.DATE) ??
    fields.find(
      (f) =>
        !f.trashed && f.type === E_FIELD_TYPE.DATE && f._id !== startField?._id,
    );
  let endField: IField | undefined;
  if (resolvedEnd && resolvedEnd._id !== startField?._id) {
    endField = resolvedEnd;
  }

  return {
    titleField:
      resolveLayoutField(
        fields,
        layoutFields,
        'title',
        E_FIELD_TYPE.TEXT_SHORT,
      ) ??
      getFieldBySlug(fields, 'titulo', E_FIELD_TYPE.TEXT_SHORT) ??
      getFirstFieldByType(fields, E_FIELD_TYPE.TEXT_SHORT),
    descriptionField:
      resolveLayoutField(
        fields,
        layoutFields,
        'description',
        E_FIELD_TYPE.TEXT_LONG,
      ) ??
      getFieldBySlug(fields, 'descricao', E_FIELD_TYPE.TEXT_LONG) ??
      getFirstFieldByType(fields, E_FIELD_TYPE.TEXT_LONG),
    startField,
    endField,
    colorField:
      resolveLayoutField(
        fields,
        layoutFields,
        'color',
        E_FIELD_TYPE.DROPDOWN,
      ) ??
      getFieldBySlug(fields, 'cor', E_FIELD_TYPE.DROPDOWN) ??
      getFirstFieldByType(fields, E_FIELD_TYPE.DROPDOWN),
    participantsField:
      resolveLayoutField(fields, layoutFields, 'participants') ??
      getFieldBySlug(fields, 'participantes', E_FIELD_TYPE.USER),
    reminderField:
      resolveLayoutField(fields, layoutFields, 'reminder') ??
      getFieldBySlug(fields, 'lembrete', E_FIELD_TYPE.FIELD_GROUP),
  };
}

export function isCalendarTemplate(table?: ITable | null): boolean {
  if (!table) return false;
  let fields: Array<IField> = [];
  if (Array.isArray(table.fields)) fields = table.fields.filter(Boolean);
  const resolved = resolveCalendarFields(fields);

  return Boolean(
    resolved.titleField &&
    resolved.descriptionField &&
    resolved.startField &&
    resolved.endField &&
    resolved.colorField &&
    resolved.startField.slug === 'data-inicio' &&
    resolved.endField.slug === 'data-termino',
  );
}

export function parseRowDateValue(value: unknown): Date | null {
  const raw = firstValue(value);

  if (!raw) return null;
  if (raw instanceof Date) {
    if (isValid(raw)) return raw;
    return null;
  }

  if (isRecord(raw)) {
    const nested = raw.date ?? raw.value ?? raw.start ?? raw.end;
    if (!nested) return null;
    const parsedNested = new Date(String(nested));
    if (isValid(parsedNested)) return parsedNested;
    return null;
  }

  const parsed = new Date(String(raw));
  if (isValid(parsed)) return parsed;
  return null;
}

function resolveEventColor(
  row: IRow,
  colorField?: IField,
): { color: string; colorLabel: string | null } {
  if (!colorField) {
    return { color: DEFAULT_EVENT_COLOR, colorLabel: null };
  }

  const raw = firstValue(row[colorField.slug]);
  if (!raw) return { color: DEFAULT_EVENT_COLOR, colorLabel: null };

  if (isRecord(raw)) {
    const color = String(raw.color ?? '').trim();
    const label = String(raw.label ?? '').trim() || null;
    if (color) return { color, colorLabel: label };
  }

  const selectedId = String(raw).trim();
  const option = colorField.dropdown.find((item) => item.id === selectedId);
  if (option?.color) {
    return { color: option.color, colorLabel: option.label ?? null };
  }

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(selectedId)) {
    return { color: selectedId, colorLabel: null };
  }

  return { color: DEFAULT_EVENT_COLOR, colorLabel: option?.label ?? null };
}

export function normalizeCalendarEvents(
  rows: Array<IRow>,
  fields: Array<IField>,
  layoutFields?: ILayoutFields | null,
): Array<CalendarEventItem> {
  const resolved = resolveCalendarFields(fields, layoutFields);
  if (!resolved.titleField || !resolved.startField) return [];

  return rows
    .map((row) => {
      const start = parseRowDateValue(row[resolved.startField!.slug]);
      if (!start) return null;

      let rawEnd: Date | null = null;
      if (resolved.endField) {
        rawEnd = parseRowDateValue(row[resolved.endField.slug]);
      }
      let end = addMinutes(start, 30);
      if (rawEnd && rawEnd.getTime() > start.getTime()) end = rawEnd;

      const title =
        toText(row[resolved.titleField!.slug]).trim() || 'Sem título';
      let description = '';
      if (resolved.descriptionField) {
        description = stripHtml(toText(row[resolved.descriptionField.slug]));
      }
      const { color, colorLabel } = resolveEventColor(row, resolved.colorField);

      let rawParticipants: unknown = null;
      if (resolved.participantsField) {
        rawParticipants = row[resolved.participantsField.slug];
      }
      let participants: Array<{ _id: string; name: string }> = [];
      if (Array.isArray(rawParticipants)) {
        participants = rawParticipants
          .filter(
            (p: unknown): p is { _id: string; name: string } =>
              typeof p === 'object' && p !== null && 'name' in p,
          )
          .map((p) => ({ _id: String(p._id), name: String(p.name) }));
      }

      return {
        row,
        rowId: row._id,
        title,
        description,
        start,
        end,
        color,
        colorLabel,
        participants,
      } satisfies CalendarEventItem;
    })
    .filter((event): event is CalendarEventItem => Boolean(event))
    .sort((a, b) => {
      const byStart = compareAsc(a.start, b.start);
      if (byStart !== 0) return byStart;
      const byEnd = compareAsc(a.end, b.end);
      if (byEnd !== 0) return byEnd;
      return a.title.localeCompare(b.title, 'pt-BR');
    });
}

export function isMultiDayCalendarEvent(event: CalendarEventItem): boolean {
  return (
    !isSameDay(event.start, event.end) ||
    event.end.getTime() - event.start.getTime() >= 24 * 60 * 60 * 1000
  );
}

export function eventOccursOnDay(event: CalendarEventItem, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = startOfDay(addMinutes(day, 24 * 60)).getTime();
  return event.start.getTime() < dayEnd && event.end.getTime() > dayStart;
}

export function formatEventTimeRange(event: CalendarEventItem): string {
  const sameDay = isSameDay(event.start, event.end);
  if (sameDay) {
    return `${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`;
  }
  return `${format(event.start, 'dd/MM HH:mm')} - ${format(event.end, 'dd/MM HH:mm')}`;
}

export function toDateTimeLocalInputValue(
  value: Date | null | undefined,
): string {
  if (!value || !isValid(value)) return '';
  return format(value, "yyyy-MM-dd'T'HH:mm");
}

export function parseDateTimeLocalInputValue(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (isValid(parsed)) return parsed;
  return null;
}
