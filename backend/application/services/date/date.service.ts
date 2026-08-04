import { Service } from 'fastify-decorators';

import type { MonthBucket } from './date-contract.service';
import { DateContractService } from './date-contract.service';

const MONTH_LABELS_PT = [
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
] as const;

const PT_BR_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const DEFAULT_MASK = 'dd/MM/yyyy';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

@Service()
export default class DateService implements DateContractService {
  now(): Date {
    return new Date();
  }

  today(): Date {
    const now = this.now();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  isoDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    return `${year}-${month}-${day}`;
  }

  toIso(value: Date | string | null | undefined): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toISOString();
  }

  startOfDay(value: Date | string): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  endOfDay(value: Date | string): Date {
    const date = new Date(value);
    date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  format(date: Date, mask: string = DEFAULT_MASK): string {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

    return mask
      .replace('dd', pad(date.getDate()))
      .replace('MM', pad(date.getMonth() + 1))
      .replace('yyyy', date.getFullYear().toString())
      .replace('HH', pad(date.getHours()))
      .replace('mm', pad(date.getMinutes()))
      .replace('ss', pad(date.getSeconds()));
  }

  formatPtBR(date: Date): string {
    return PT_BR_FORMATTER.format(date);
  }

  monthKey(value: Date | string): string {
    const date = new Date(value);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  lastMonths(count: number): MonthBucket[] {
    const now = this.now();
    const buckets: MonthBucket[] = [];

    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      buckets.push({
        key: `${ref.getFullYear()}-${pad(ref.getMonth() + 1)}`,
        label: MONTH_LABELS_PT[ref.getMonth()],
      });
    }

    return buckets;
  }
}
