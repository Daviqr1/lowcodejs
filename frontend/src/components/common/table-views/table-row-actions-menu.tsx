import { useRouter } from '@tanstack/react-router';
import { EllipsisIcon, EyeIcon, PencilIcon } from 'lucide-react';
import React from 'react';

import { ExtensionSlot } from '@/components/common/extension-slot';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTablePermission } from '@/hooks/use-table-permission';
import type { IRow, ITable } from '@/lib/interfaces';

type Props = {
  slug: string;
  row: IRow;
  table?: ITable;
};

export function TableRowActionsMenu({
  slug,
  row,
  table,
}: Props): React.JSX.Element {
  const router = useRouter();
  const permission = useTablePermission(table);
  const canEdit = permission.can('UPDATE_ROW') && row.trashedAt == null;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu
        dir="ltr"
        modal={false}
      >
        <DropdownMenuTrigger className="p-1 rounded-full hover:bg-muted cursor-pointer">
          <EllipsisIcon className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="inline-flex space-x-1 w-full cursor-pointer"
            onClick={(): void => {
              void router.navigate({
                to: '/tables/$slug/row',
                params: { slug },
                search: { _id: row._id },
              });
            }}
          >
            <EyeIcon className="size-4" />
            <span>Visualizar</span>
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem
              className="inline-flex space-x-1 w-full cursor-pointer"
              onClick={(): void => {
                void router.navigate({
                  to: '/tables/$slug/row',
                  params: { slug },
                  search: { _id: row._id, mode: 'edit' as const },
                });
              }}
            >
              <PencilIcon className="size-4" />
              <span>Editar</span>
            </DropdownMenuItem>
          )}

          <ExtensionSlot
            id="table.row.actions"
            context={{ table, row, slug }}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
