import {
  DownloadIcon,
  FileSpreadsheetIcon,
  LoaderCircleIcon,
  UploadIcon,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type CsvDropdownProps = {
  /** Ação de importar. Quando ausente, a opção "Importar" não é exibida. */
  onImport?: () => void;
  /** Ação de exportar. Quando ausente, a opção "Exportar" não é exibida. */
  onExport?: () => void;
  /** Mostra spinner e desabilita a opção de exportar enquanto exporta. */
  exportPending?: boolean;
  disabled?: boolean;
  label?: string;
  testId?: string;
};

/**
 * Dropdown reutilizável de ações CSV (Importar / Exportar), no mesmo padrão
 * visual do dropdown de Configuração da tabela. Genérico: cada módulo passa
 * suas próprias ações via `onImport` / `onExport`.
 */
export function CsvDropdown({
  onImport,
  onExport,
  exportPending = false,
  disabled = false,
  label = 'CSV',
  testId = 'csv-dropdown',
}: CsvDropdownProps): React.JSX.Element | null {
  if (!onImport && !onExport) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('shadow-none p-1 h-auto')}
          disabled={disabled}
          data-test-id={`${testId}-btn`}
        >
          <FileSpreadsheetIcon className="size-4" />
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        data-test-id={`${testId}-content`}
      >
        {onImport && (
          <DropdownMenuItem
            className="inline-flex space-x-1 w-full"
            onClick={onImport}
            data-test-id={`${testId}-import`}
          >
            <UploadIcon className="size-4" />
            <span>Importar</span>
          </DropdownMenuItem>
        )}
        {onExport && (
          <DropdownMenuItem
            className="inline-flex space-x-1 w-full"
            disabled={exportPending}
            onClick={onExport}
            data-test-id={`${testId}-export`}
          >
            {exportPending && (
              <LoaderCircleIcon className="size-4 animate-spin" />
            )}
            {!exportPending && <DownloadIcon className="size-4" />}
            <span>Exportar</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
