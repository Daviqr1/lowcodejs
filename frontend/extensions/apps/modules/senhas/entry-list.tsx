import {
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import type { IPasswordEntry } from './senhas-types';
import { refName } from './senhas-types';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type SenhasView = 'table' | 'cards';

async function copy(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  } catch {
    toast.error('Não foi possível copiar');
  }
}

const MASK = '••••••••••••';

interface RowActionsProps {
  entry: IPasswordEntry;
  canEdit: boolean;
  onEdit: (entry: IPasswordEntry) => void;
  onDelete: (entry: IPasswordEntry) => void;
}

function RowActions({
  entry,
  canEdit,
  onEdit,
  onDelete,
}: RowActionsProps): React.JSX.Element | null {
  if (!canEdit) return null;
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        title="Editar"
        onClick={() => onEdit(entry)}
      >
        <PencilIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Excluir"
        onClick={() => onDelete(entry)}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}

function SecretCell({ secret }: { secret: string }): React.JSX.Element {
  const [reveal, setReveal] = React.useState(false);
  let revealTitle = 'Revelar';
  if (reveal) revealTitle = 'Ocultar';
  return (
    <div className="flex items-center gap-1">
      <span className="truncate font-mono">
        {reveal && secret}
        {!reveal && MASK}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        title={revealTitle}
        onClick={() => setReveal((r) => !r)}
      >
        {reveal && <EyeOffIcon className="size-3.5" />}
        {!reveal && <EyeIcon className="size-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Copiar senha"
        onClick={() => copy(secret, 'Senha')}
      >
        <CopyIcon className="size-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabela (visão principal, igual às demais aplicações)
// ---------------------------------------------------------------------------

interface EntryTableProps {
  entries: Array<IPasswordEntry>;
  canEdit: boolean;
  onEdit: (entry: IPasswordEntry) => void;
  onDelete: (entry: IPasswordEntry) => void;
}

function EntryTable({
  entries,
  canEdit,
  onEdit,
  onDelete,
}: EntryTableProps): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Usuário</TableHead>
          <TableHead>Senha</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>Atualizado</TableHead>
          {canEdit && <TableHead className="w-24 text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry._id}>
            <TableCell className="max-w-48">
              <p className="truncate font-medium">{entry.title}</p>
              <p className="text-muted-foreground truncate text-xs">
                {refName(entry.author)}
              </p>
            </TableCell>
            <TableCell className="max-w-40">
              {entry.username && (
                <div className="flex items-center gap-1">
                  <span className="truncate font-mono">{entry.username}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Copiar usuário"
                    onClick={() => copy(entry.username ?? '', 'Usuário')}
                  >
                    <CopyIcon className="size-3.5" />
                  </Button>
                </div>
              )}
              {!entry.username && (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="max-w-48">
              <SecretCell secret={entry.secret} />
            </TableCell>
            <TableCell className="max-w-40">
              {entry.url && (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ExternalLinkIcon className="size-3 shrink-0" />
                  <span className="truncate">{entry.url}</span>
                </a>
              )}
              {!entry.url && <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
              {new Date(entry.updatedAt).toLocaleDateString('pt-BR')}
            </TableCell>
            {canEdit && (
              <TableCell className="text-right">
                <RowActions
                  entry={entry}
                  canEdit={canEdit}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Cards (visão alternativa)
// ---------------------------------------------------------------------------

interface EntryCardProps {
  entry: IPasswordEntry;
  canEdit: boolean;
  onEdit: (entry: IPasswordEntry) => void;
  onDelete: (entry: IPasswordEntry) => void;
}

function EntryCard({
  entry,
  canEdit,
  onEdit,
  onDelete,
}: EntryCardProps): React.JSX.Element {
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{entry.title}</h3>
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <ExternalLinkIcon className="size-3" />
              <span className="truncate">{entry.url}</span>
            </a>
          )}
        </div>
        <RowActions
          entry={entry}
          canEdit={canEdit}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {entry.username && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground shrink-0">Usuário</span>
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate font-mono">{entry.username}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Copiar usuário"
              onClick={() => copy(entry.username ?? '', 'Usuário')}
            >
              <CopyIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground shrink-0">Senha</span>
        <SecretCell secret={entry.secret} />
      </div>

      {entry.notes && (
        <p className="bg-muted/50 text-muted-foreground whitespace-pre-wrap rounded-md p-2 text-xs">
          {entry.notes}
        </p>
      )}

      <p className="text-muted-foreground text-xs">
        Por {refName(entry.author)} ·{' '}
        {new Date(entry.updatedAt).toLocaleString('pt-BR')}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------

interface EntryListProps {
  entries: Array<IPasswordEntry>;
  isLoading: boolean;
  canEdit: boolean;
  view: SenhasView;
  onEdit: (entry: IPasswordEntry) => void;
  onDelete: (entry: IPasswordEntry) => void;
}

export function EntryList({
  entries,
  isLoading,
  canEdit,
  view,
  onEdit,
  onDelete,
}: EntryListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-12 w-full"
          />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KeyRoundIcon />
          </EmptyMedia>
          <EmptyTitle>Nenhuma senha neste canal</EmptyTitle>
          <EmptyDescription>
            {canEdit &&
              'Adicione a primeira senha — ela será criptografada no banco.'}
            {!canEdit &&
              'Você tem acesso de leitura, mas ainda não há senhas aqui.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (view === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        {entries.map((entry) => (
          <EntryCard
            key={entry._id}
            entry={entry}
            canEdit={canEdit}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-2">
      <EntryTable
        entries={entries}
        canEdit={canEdit}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
