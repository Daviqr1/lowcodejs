import type { IErrorLog } from '@/hooks/tanstack-query/use-error-log-read-paginated';

export function entriesToCsv(entries: Array<IErrorLog>): string {
  const header = [
    'createdAt',
    'statusCode',
    'message',
    'cause',
    'method',
    'url',
    'user_email',
    'errors',
  ];
  const rows = entries.map((entry) => [
    entry.createdAt,
    String(entry.statusCode),
    entry.message,
    entry.cause ?? '',
    entry.method,
    entry.url,
    entry.user?.email ?? '',
    JSON.stringify(entry.errors ?? null),
  ]);
  const escape = (cell: string): string => {
    const needsQuote = /[",\n]/.test(cell);
    const safe = cell.replace(/"/g, '""');
    if (needsQuote) return `"${safe}"`;
    return safe;
  };
  return [header, ...rows]
    .map((row) => row.map((cell) => escape(String(cell))).join(','))
    .join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
