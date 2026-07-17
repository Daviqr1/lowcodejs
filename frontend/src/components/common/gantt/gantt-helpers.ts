import { differenceInDays, parseISO, startOfDay } from 'date-fns';

import type { IDropdown, IField, IRow } from '@/lib/interfaces';
import { normalizeRowValue } from '@/lib/kanban-helpers';

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = parseISO(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }
  return null;
}

export function getStatusLabel(
  row: IRow,
  listField?: IField,
): { id: string; label: string; color: string | null } | null {
  if (!listField) return null;
  const raw = normalizeRowValue(row[listField.slug]);
  const optionId = raw[0];
  if (!optionId) return null;
  const option = listField.dropdown?.find((o: IDropdown) => o.id === optionId);
  if (!option) return null;
  return { id: option.id, label: option.label, color: option.color };
}

export function getBarStyle(
  start: Date | null,
  end: Date | null,
  viewStart: Date,
  dayWidth: number,
  daysCount: number,
): { left: number; width: number } | null {
  if (!start) return null;
  const barStart = startOfDay(start);
  let barEnd = barStart;
  if (end) barEnd = startOfDay(end);
  const offsetDays = differenceInDays(barStart, viewStart);
  const durationDays = Math.max(differenceInDays(barEnd, barStart), 1);

  if (offsetDays + durationDays < 0 || offsetDays > daysCount) return null;

  return {
    left: Math.max(offsetDays, 0) * dayWidth,
    width: Math.min(
      durationDays * dayWidth,
      (daysCount - Math.max(offsetDays, 0)) * dayWidth,
    ),
  };
}
