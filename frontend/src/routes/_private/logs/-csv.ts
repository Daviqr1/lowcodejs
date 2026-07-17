import type { ILogger } from '@/lib/interfaces';

export function entriesToCsv(entries: Array<ILogger>): string {
  const header = [
    'createdAt',
    'user_id',
    'user_email',
    'action',
    'object',
    'object_id',
    'url',
    'creator',
    'objectCreatedAt',
    'updater',
    'objectUpdatedAt',
    'content',
  ];
  const rows = entries.map((entry) => [
    entry.createdAt,
    entry.user?._id ?? '',
    entry.user?.email ?? '',
    entry.action,
    entry.object ?? '',
    entry.object_id ?? '',
    entry.url,
    entry.creator?.email ?? '',
    entry.objectCreatedAt ?? '',
    entry.updater?.email ?? '',
    entry.objectUpdatedAt ?? '',
    JSON.stringify(entry.content ?? {}),
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
