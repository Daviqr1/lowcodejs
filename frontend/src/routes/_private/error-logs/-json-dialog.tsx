import { FileJsonIcon } from 'lucide-react';
import React from 'react';

import { StatusBadge } from './-status-badge';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { IErrorLog } from '@/hooks/tanstack-query/use-error-log-read-paginated';
import { formatDate } from '@/lib/format-date';

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-border/60 px-3 py-2 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm break-all">{value}</span>
    </div>
  );
}

function EntryDetails({ entry }: { entry: IErrorLog }): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30">
        <MetaRow
          label="Data"
          value={formatDate(entry.createdAt)}
        />
        <MetaRow
          label="Status"
          value={<StatusBadge status={entry.statusCode} />}
        />
        <MetaRow
          label="Mensagem"
          value={entry.message}
        />
        <MetaRow
          label="Cause"
          value={
            entry.cause ?? <span className="text-muted-foreground">—</span>
          }
        />
        <MetaRow
          label="Usuário"
          value={
            <>
              {entry.user && (
                <span title={entry.user.email}>
                  {entry.user.name}{' '}
                  <span className="text-muted-foreground">
                    ({entry.user.email})
                  </span>
                </span>
              )}
              {!entry.user && <span className="text-muted-foreground">—</span>}
            </>
          }
        />
        <MetaRow
          label="Método"
          value={<span className="font-mono text-xs">{entry.method}</span>}
        />
        <MetaRow
          label="URL"
          value={<span className="font-mono text-xs">{entry.url}</span>}
        />
        <MetaRow
          label="Situação"
          value={
            <>
              {entry.resolved && (
                <span className="text-emerald-700 dark:text-emerald-300">
                  Resolvido
                  {entry.resolvedAt && ` em ${formatDate(entry.resolvedAt)}`}
                </span>
              )}
              {!entry.resolved && (
                <span className="text-muted-foreground">Em aberto</span>
              )}
            </>
          }
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <FileJsonIcon className="size-3.5" />
          Erros por campo
        </div>
        {hasContent(entry.errors) && (
          <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
            {formatJson(entry.errors)}
          </pre>
        )}
        {!hasContent(entry.errors) && (
          <p className="rounded-md border bg-muted/30 p-3 text-xs italic text-muted-foreground">
            Este erro não trouxe detalhes por campo — sem conteúdo adicional
            para exibir.
          </p>
        )}
      </div>
    </div>
  );
}

interface JsonDialogProps {
  entry: IErrorLog | null;
  onClose: () => void;
}

export function JsonDialog({
  entry,
  onClose,
}: JsonDialogProps): React.JSX.Element {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(open): void => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJsonIcon className="size-4" />
            Detalhes do erro
          </DialogTitle>
          <DialogDescription>
            Metadados do erro registrado e detalhes por campo.
          </DialogDescription>
        </DialogHeader>

        {entry && <EntryDetails entry={entry} />}
      </DialogContent>
    </Dialog>
  );
}
