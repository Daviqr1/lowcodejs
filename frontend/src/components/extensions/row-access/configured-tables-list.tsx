import { useSuspenseQuery } from '@tanstack/react-query';
import { ChevronDownIcon, SettingsIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { tableListOptions } from '@/hooks/tanstack-query/_query-options';

interface Props {
  tableIds: Array<string>;
  onClick: (tableId: string) => void;
}

const VISIBLE_LIMIT = 5;

/**
 * Lista compacta de tabelas configuradas pelo plugin row-access.
 * - Resolve nomes via /tables/paginated (em vez de mostrar hash do _id)
 * - Mostra até VISIBLE_LIMIT badges; excedente vai pra dropdown "+N mais"
 */
export function ConfiguredTablesList({
  tableIds,
  onClick,
}: Props): React.JSX.Element {
  // Busca um número alto de tabelas (assumindo dezenas, não milhares).
  // Pra escala maior, criar endpoint /tables/by-ids no backend.
  const { data } = useSuspenseQuery(
    tableListOptions({ page: 1, perPage: 100 }),
  );

  const nameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const t of data.data) map.set(t._id, t.name);
    return map;
  }, [data]);

  const labels = tableIds.map((id) => ({
    id,
    label: nameById.get(id) ?? id.slice(-6),
  }));

  const visible = labels.slice(0, VISIBLE_LIMIT);
  const overflow = labels.slice(VISIBLE_LIMIT);

  return (
    <>
      <p className="text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
        Tabelas configuradas
        <span className="font-mono text-[10px] text-muted-foreground">
          ({tableIds.length})
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {visible.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onClick(id)}
            className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-md border bg-muted/30 px-2 py-1 text-xs text-foreground hover:bg-muted transition-colors"
            title={`Editar config de "${label}"`}
          >
            <SettingsIcon className="size-3 shrink-0 opacity-70" />
            <span className="truncate">{label}</span>
          </button>
        ))}

        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                +{overflow.length} mais
                <ChevronDownIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 overflow-y-auto"
            >
              {overflow.map(({ id, label }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => onClick(id)}
                  className="cursor-pointer text-xs"
                >
                  <SettingsIcon className="size-3 opacity-70 mr-2" />
                  <span className="truncate max-w-[200px]">{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </>
  );
}
