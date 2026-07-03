import {
  addDays,
  addMonths,
  isSameDay as dateFnsIsSameDay,
  isToday as dateFnsIsToday,
  endOfMonth,
  format,
  getDay,
  getDaysInMonth,
  isAfter,
  isBefore,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function isToday(date: Date): boolean {
  return dateFnsIsToday(date);
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return dateFnsIsSameDay(a, b);
}

export function isValidDate(date: Date | null): boolean {
  if (!date) return false;
  return isValid(date);
}

export function isDateStringValid(
  text: string,
  formatStr: string = 'dd/MM/yyyy',
): boolean {
  const parsed = parseDate(text, formatStr);
  if (!parsed) return false;

  const formatted = formatDate(parsed, formatStr);
  return formatted === text;
}

export function formatDate(
  date: Date | null,
  formatStr: string = 'dd/MM/yyyy',
): string {
  if (!date || !isValid(date)) return '';
  return format(date, formatStr, { locale: ptBR });
}

export function parseDate(
  text: string,
  formatStr: string = 'dd/MM/yyyy',
): Date | null {
  if (!text || text.trim() === '') return null;

  try {
    const parsed = parse(text, formatStr, new Date(), { locale: ptBR });
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

export function getMonthName(month: number): string {
  return MONTHS[month] || '';
}

export function getMonthShortName(month: number): string {
  return MONTHS_SHORT[month] || '';
}

export function generateYearRange(centerYear: number): Array<number> {
  const startYear = centerYear - 5;
  const years: Array<number> = [];
  for (let i = 0; i < 12; i++) {
    years.push(startYear + i);
  }
  return years;
}

export interface CalendarDays {
  previous: Array<Date>;
  current: Array<Date>;
  next: Array<Date>;
}

export function getCalendarDays(date: Date): CalendarDays {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const daysInMonth = getDaysInMonth(date);
  const startDayOfWeek = getDay(monthStart);

  // Previous month days
  const previous: Array<Date> = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    previous.push(subDays(monthStart, i + 1));
  }

  // Current month days
  const current: Array<Date> = [];
  for (let i = 1; i <= daysInMonth; i++) {
    current.push(new Date(date.getFullYear(), date.getMonth(), i));
  }

  // Next month days (fill remaining cells to complete 6 rows = 42 cells)
  const next: Array<Date> = [];
  const totalCells = 42;
  const remainingCells = totalCells - (previous.length + current.length);
  for (let i = 1; i <= remainingCells; i++) {
    next.push(addDays(monthEnd, i));
  }

  return { previous, current, next };
}

export function isDateDisabled(
  date: Date,
  minDate?: Date | null,
  maxDate?: Date | null,
): boolean {
  const day = startOfDay(date);

  if (minDate && isBefore(day, startOfDay(minDate))) {
    return true;
  }

  if (maxDate && isAfter(day, startOfDay(maxDate))) {
    return true;
  }

  return false;
}

export function navigateMonth(date: Date, direction: 'prev' | 'next'): Date {
  let amount = -1;
  if (direction === 'next') amount = 1;
  return addMonths(date, amount);
}

// Range utilities
export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export function isDateInRange(
  date: Date,
  start: Date | null,
  end: Date | null,
): boolean {
  if (!start || !end) return false;

  const day = startOfDay(date);
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);

  return (
    (isAfter(day, startDay) || dateFnsIsSameDay(day, startDay)) &&
    (isBefore(day, endDay) || dateFnsIsSameDay(day, endDay))
  );
}

export function isDateBetween(
  date: Date,
  start: Date | null,
  end: Date | null,
): boolean {
  if (!start || !end) return false;

  const day = startOfDay(date);
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);

  // Ensure start is before end
  let actualStart = endDay;
  let actualEnd = startDay;
  if (isBefore(startDay, endDay)) {
    actualStart = startDay;
    actualEnd = endDay;
  }

  return isAfter(day, actualStart) && isBefore(day, actualEnd);
}

export function formatDateRange(
  start: Date | null,
  end: Date | null,
  formatStr: string = 'dd/MM/yyyy',
  separator: string = '~',
): string {
  if (!start && !end) return '';

  let startStr = '';
  if (start) startStr = format(start, formatStr, { locale: ptBR });
  let endStr = '';
  if (end) endStr = format(end, formatStr, { locale: ptBR });

  if (startStr && endStr) {
    return `${startStr} ${separator} ${endStr}`;
  }

  return startStr || endStr;
}

export function parseDateRange(
  text: string,
  formatStr: string = 'dd/MM/yyyy',
  separator: string = '~',
): DateRange {
  const parts = text.split(separator).map((p) => p.trim());

  if (parts.length === 2) {
    return {
      startDate: parseDate(parts[0], formatStr),
      endDate: parseDate(parts[1], formatStr),
    };
  }

  if (parts.length === 1 && parts[0]) {
    const date = parseDate(parts[0], formatStr);
    return { startDate: date, endDate: date };
  }

  return { startDate: null, endDate: null };
}
