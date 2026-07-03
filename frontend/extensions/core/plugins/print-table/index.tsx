import { PrinterIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ITable } from '@/lib/interfaces';

interface Props {
  /** Tabela em foco. Recebida via context do `<ExtensionSlot id="table.actions">`. */
  table?: ITable;
}

export default function PrintTablePlugin({ table }: Props): React.JSX.Element {
  let label = 'Imprimir';
  if (table) label = `Imprimir ${table.name}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="shadow-none p-1 h-auto"
          onClick={() => window.print()}
          data-test-id="plugin-print-table"
        >
          <PrinterIcon className="size-4" />
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
