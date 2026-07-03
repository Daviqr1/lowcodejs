import { DownloadIcon, LoaderCircleIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

type Props = {
  onClick: () => void;
  disabled?: boolean;
  isPending?: boolean;
  label?: string;
  testId?: string;
};

export function ExportCsvButton({
  onClick,
  disabled,
  isPending,
  label = 'Exportar',
  testId = 'export-csv-btn',
}: Props): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled || isPending}
      data-test-id={testId}
    >
      {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
      {!isPending && <DownloadIcon className="size-4" />}
      <span>{label}</span>
    </Button>
  );
}
