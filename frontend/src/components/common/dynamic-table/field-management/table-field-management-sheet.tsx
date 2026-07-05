import React from 'react';

import { FieldManagement } from './field-management';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTableFieldManagement } from '@/hooks/use-table-field-management';
import type { ITable } from '@/lib/interfaces';

type TableFieldManagementSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: ITable;
};

export function TableFieldManagementSheet({
  open,
  onOpenChange,
  table,
}: TableFieldManagementSheetProps): React.JSX.Element {
  const actions = useTableFieldManagement(table);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle>Gerenciar campos</SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <FieldManagement.Root actions={actions}>
            <FieldManagement.Tabs />
          </FieldManagement.Root>
        </div>
      </SheetContent>
    </Sheet>
  );
}
