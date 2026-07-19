import { PrinterIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function DocumentPrintButton({
  onClick,
}: {
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Button
      data-slot="document-print-button"
      data-test-id="document-print-btn"
      onClick={onClick}
      aria-label="Imprimir / salvar em PDF"
      title="Imprimir / salvar em PDF"
      variant="ghost"
      className="p-0 z-50 flex cursor-pointer items-center gap-2 absolute top-2 right-2 no-print"
    >
      <PrinterIcon className="size-5" />
    </Button>
  );
}
