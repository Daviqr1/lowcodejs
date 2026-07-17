import { FileJsonIcon } from 'lucide-react';
import React from 'react';

import { ActionBadge } from './-action-badge';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LOGGER_OBJECT_LABEL } from '@/lib/constant';
import { formatDate } from '@/lib/format-date';
import type { ILogger, Merge } from '@/lib/interfaces';

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

function EntryDetails({ entry }: { entry: ILogger }): React.JSX.Element {
  const dateDisplay = formatDate(entry.createdAt);

  let objectLabel = '—';
  if (entry.object) {
    objectLabel = LOGGER_OBJECT_LABEL[entry.object];
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30">
        <MetaRow
          label="Data"
          value={dateDisplay}
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
              {!entry.user && (
                <span className="italic text-muted-foreground">Anônimo</span>
              )}
            </>
          }
        />
        <MetaRow
          label="Ação"
          value={<ActionBadge action={entry.action} />}
        />
        <MetaRow
          label="Tipo de objeto"
          value={objectLabel}
        />
        <MetaRow
          label="ID do objeto"
          value={
            entry.object_id ?? <span className="text-muted-foreground">—</span>
          }
        />
        <MetaRow
          label="URL"
          value={<span className="font-mono text-xs">{entry.url}</span>}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <FileJsonIcon className="size-3.5" />
          Conteúdo
        </div>
        {hasContent(entry.content) && (
          <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
            {formatJson(entry.content)}
          </pre>
        )}
        {!hasContent(entry.content) && (
          <p className="rounded-md border bg-muted/30 p-3 text-xs italic text-muted-foreground">
            Esta ação não enviou body, query ou parâmetros — sem conteúdo
            adicional para exibir.
          </p>
        )}
      </div>
    </div>
  );
}

type JsonDialogProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  { entry: ILogger }
>;

export function JsonDialog({
  ref,
  entry,
  ...rest
}: JsonDialogProps): React.JSX.Element {
  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJsonIcon className="size-4" />
            Detalhes do log
          </DialogTitle>
          <DialogDescription>
            Metadados da ação registrada e conteúdo da requisição.
          </DialogDescription>
        </DialogHeader>

        <EntryDetails entry={entry} />
      </DialogContent>
    </Dialog>
  );
}
