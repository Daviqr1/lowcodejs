import React from 'react';

import { FieldManagement } from '../field-management/field-management';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroupFieldManagement } from '@/hooks/use-group-field-management';
import type { ITable, Merge } from '@/lib/interfaces';

type GroupFieldManagementSheetProps = Merge<
  React.ComponentProps<typeof SheetTrigger>,
  {
    table: ITable;
    groupSlug: string;
  }
>;

export function GroupFieldManagementSheet({
  ref,
  table,
  groupSlug,
  ...rest
}: GroupFieldManagementSheetProps): React.JSX.Element {
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
        <GroupFieldManagementSheetContent
          table={table}
          groupSlug={groupSlug}
        />
      </SheetContent>
    </Sheet>
  );
}

function GroupFieldManagementSheetContent({
  table,
  groupSlug,
}: {
  table: ITable;
  groupSlug: string;
}): React.JSX.Element {
  const actions = useGroupFieldManagement(table, groupSlug);

  const targetGroup = (table.groups ?? []).find((g) => g.slug === groupSlug);
  const groupName = targetGroup?.name ?? groupSlug;

  const nonNativeFields = actions.fields.filter((f) => !f.native);
  const trashedCount = nonNativeFields.filter((f) => f.trashed).length;

  return (
    <React.Fragment>
      <SheetHeader className="px-4 py-3 border-b shrink-0">
        <SheetTitle>Gerenciar campos - {groupName}</SheetTitle>
        <SheetDescription className="sr-only">
          Adicione, edite ou remova os campos do grupo {groupName}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 min-h-0 flex flex-col">
        <FieldManagement.Root actions={actions}>
          <Tabs
            defaultValue="display"
            className="w-full flex flex-col flex-1 min-h-0"
          >
            <div className="px-4 pt-4 shrink-0">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="display">Lista</TabsTrigger>
                <TabsTrigger value="form">Formulários</TabsTrigger>
                <TabsTrigger
                  value="trashed"
                  disabled={trashedCount === 0}
                >
                  Lixeira{trashedCount > 0 && ` (${trashedCount})`}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="display"
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
            >
              <FieldManagement.List visibilityKey="showInList" />
            </TabsContent>

            <TabsContent
              value="form"
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
            >
              <FieldManagement.List
                visibilityKey="showInForm"
                excludeNative
              />
            </TabsContent>

            <TabsContent
              value="trashed"
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
            >
              <FieldManagement.TrashedList excludeNative />
            </TabsContent>
          </Tabs>
        </FieldManagement.Root>
      </div>
    </React.Fragment>
  );
}
