import type * as React from 'react';

import { FieldManagement } from './field-management';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTableFieldManagement } from '@/hooks/use-table-field-management';
import type { ITable, Merge } from '@/lib/interfaces';

type TableFieldManagementSheetProps = Merge<
  React.ComponentProps<typeof SheetTrigger>,
  { table: ITable }
>;

export function TableFieldManagementSheet({
  ref,
  table,
  ...rest
}: TableFieldManagementSheetProps): React.JSX.Element {
  return (
    <Sheet>
      <SheetTrigger
        {...rest}
        ref={ref}
      />
      <SheetContent
        side="right"
        className="sm:max-w-lg flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle>Gerenciar campos</SheetTitle>
          <SheetDescription className="sr-only">
            Adicione, edite ou remova os campos da tabela
          </SheetDescription>
        </SheetHeader>

        <TableFieldManagementSheetContent table={table} />
      </SheetContent>
    </Sheet>
  );
}

function TableFieldManagementSheetContent({
  table,
}: {
  table: ITable;
}): React.JSX.Element {
  const actions = useTableFieldManagement(table);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <FieldManagement.Root actions={actions}>
        <FieldManagement.Tabs />
      </FieldManagement.Root>
    </div>
  );
}
