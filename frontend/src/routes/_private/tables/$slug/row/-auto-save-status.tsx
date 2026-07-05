import {
  AlertCircleIcon,
  CheckIcon,
  FileWarningIcon,
  Loader2Icon,
} from 'lucide-react';
import React from 'react';

import type { AutoSaveStatus } from '@/hooks/use-auto-save';

type AutoSaveStatusProps = {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
};

function formatElapsed(date: Date | null, now: number): string {
  if (!date) return '';
  const seconds = Math.floor((now - date.getTime()) / 1000);
  if (seconds < 5) return 'agora mesmo';
  if (seconds < 60) return `há ${seconds.toString()} segundos`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'há 1 minuto';
  return `há ${minutes.toString()} minutos`;
}

export function AutoSaveStatusIndicator({
  status,
  lastSavedAt,
}: AutoSaveStatusProps): React.JSX.Element {
  const [now, setNow] = React.useState<number>(Date.now());

  React.useEffect((): (() => void) => {
    if (status !== 'saved') return (): void => {};
    const interval = setInterval((): void => setNow(Date.now()), 5_000);
    return (): void => clearInterval(interval);
  }, [status]);

  if (status === 'idle') {
    return <span className="text-xs text-muted-foreground">Novo registro</span>;
  }

  if (status === 'saving') {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Loader2Icon className="size-3 animate-spin" />
        Salvando...
      </span>
    );
  }

  if (status === 'saved') {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <CheckIcon className="size-3 text-green-500" />
        {`Salvo ${formatElapsed(lastSavedAt, now)}`}
      </span>
    );
  }

  if (status === 'draft') {
    return (
      <span className="text-xs text-amber-600 flex items-center gap-1">
        <FileWarningIcon className="size-3" />
        Rascunho — campos obrigatórios faltando
      </span>
    );
  }

  return (
    <span className="text-xs text-destructive flex items-center gap-1">
      <AlertCircleIcon className="size-3" />
      Falha ao salvar
    </span>
  );
}
