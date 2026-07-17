import {
  CalendarIcon,
  GanttChartIcon,
  LayoutDashboard,
  LayoutDashboardIcon,
  LayoutListIcon,
  LayoutPanelLeft,
  ListTreeIcon,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useUpdateTable } from '@/hooks/tanstack-query/use-table-update';
import { useTablePermission } from '@/hooks/use-table-permission';
import { E_TABLE_STYLE } from '@/lib/constant';
import type { ITable, Paginated, ValueOf } from '@/lib/interfaces';
import { QueryClient } from '@/lib/query-client';
import { getAllowedTableStyles } from '@/lib/table-style';
import { cn } from '@/lib/utils';

type TableStyleViewDropdownProps = {
  slug: string;
};

export function TableStyleViewDropdown({
  slug,
}: TableStyleViewDropdownProps): React.JSX.Element | null {
  const table = useReadTable({ slug });
  const permission = useTablePermission(table.data);

  // Hook deve ser chamado antes de qualquer return condicional
  const update = useUpdateTable({
    onSuccess(data) {
      QueryClient.setQueryData<ITable>(
        ['/tables/'.concat(data.slug), data.slug],
        data,
      );

      QueryClient.setQueryData<Paginated<ITable>>(
        ['/tables/paginated'],
        (old) => {
          if (!old) return old;

          return {
            meta: old.meta,
            data: old.data.map((item) => {
              if (item._id === data._id) {
                return data;
              }
              return item;
            }),
          };
        },
      );
    },
    onError() {
      toast.error('Erro ao atualizar estilo da tabela');
    },
  });

  // Ocultar se não pode editar tabela
  if (!permission.can('UPDATE_TABLE')) return null;

  const handleStyleChange = (style: ValueOf<typeof E_TABLE_STYLE>): void => {
    if (!table.data) return;

    update.mutate({
      routeSlug: slug,
      name: table.data.name,
      description: table.data.description ?? null,
      logo: table.data.logo?._id ?? null,
      style,
      fieldOrderList: table.data.fieldOrderList ?? [],
      fieldOrderForm: table.data.fieldOrderForm ?? [],
      fieldOrderFilter: table.data.fieldOrderFilter ?? [],
      fieldOrderDetail: table.data.fieldOrderDetail ?? [],
      order: (table.data.order?.field && table.data.order) || null,
      methods: table.data.methods,
      layoutFields: table.data.layoutFields,
    });
  };

  const currentStyle = table.data?.style ?? E_TABLE_STYLE.LIST;

  const isDisabled =
    (table.status === 'success' && table.data.fields.length === 0) ||
    table.status === 'pending' ||
    update.status === 'pending';

  const allowedStyles = getAllowedTableStyles(table.data);
  const canShowDocument = allowedStyles.includes(E_TABLE_STYLE.DOCUMENT);
  const canShowCard = allowedStyles.includes(E_TABLE_STYLE.CARD);
  const canShowMosaic = allowedStyles.includes(E_TABLE_STYLE.MOSAIC);
  const canShowKanban = allowedStyles.includes(E_TABLE_STYLE.KANBAN);
  const canShowForum = allowedStyles.includes(E_TABLE_STYLE.FORUM);
  const canShowCalendar = allowedStyles.includes(E_TABLE_STYLE.CALENDAR);
  const canShowGantt = allowedStyles.includes(E_TABLE_STYLE.GANTT);

  return (
    <DropdownMenu
      data-slot="table-style-view"
      data-test-id="table-style-view"
      dir="ltr"
      modal={false}
    >
      <DropdownMenuTrigger
        asChild
        disabled={isDisabled}
      >
        <Button
          className={cn('shadow-none p-1 h-auto')}
          variant="outline"
        >
          {update.status === 'pending' && <Spinner />}

          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.GALLERY && (
              <LayoutDashboardIcon className="size-4" />
            )}

          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.LIST && (
              <LayoutListIcon className="size-4" />
            )}

          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.DOCUMENT && (
              <ListTreeIcon className="size-4" />
            )}
          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.KANBAN && (
              <LayoutDashboard className="size-4" />
            )}
          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.FORUM && (
              <MessageCircle className="size-4" />
            )}
          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.CARD && (
              <LayoutPanelLeft className="size-4" />
            )}
          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.MOSAIC && (
              <LayoutDashboard className="size-4" />
            )}
          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.CALENDAR && (
              <CalendarIcon className="size-4" />
            )}
          {table.status === 'success' &&
            currentStyle === E_TABLE_STYLE.GANTT && (
              <GanttChartIcon className="size-4" />
            )}

          <span>Exibição</span>
        </Button>
      </DropdownMenuTrigger>

      {table.status === 'success' && (
        <DropdownMenuContent className="max-w-xs">
          <DropdownMenuRadioGroup value={currentStyle}>
            <DropdownMenuRadioItem
              value={E_TABLE_STYLE.LIST}
              className="inline-flex space-x-1 w-full"
              onClick={() => handleStyleChange(E_TABLE_STYLE.LIST)}
            >
              <LayoutListIcon className="size-4" />
              <span>Lista</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              className="inline-flex space-x-1 w-full"
              value={E_TABLE_STYLE.GALLERY}
              onClick={() => handleStyleChange(E_TABLE_STYLE.GALLERY)}
            >
              <LayoutDashboardIcon className="size-4" />
              <span>Galeria</span>
            </DropdownMenuRadioItem>

            {canShowDocument && (
              <DropdownMenuRadioItem
                className="inline-flex space-x-1 w-full"
                value="document"
                onClick={() => handleStyleChange(E_TABLE_STYLE.DOCUMENT)}
              >
                <ListTreeIcon className="size-4" />
                <span>Documento</span>
              </DropdownMenuRadioItem>
            )}

            {canShowCard && (
              <DropdownMenuRadioItem
                className="inline-flex space-x-1 w-full"
                value="card"
                onClick={() => handleStyleChange(E_TABLE_STYLE.CARD)}
              >
                <LayoutPanelLeft className="size-4" />
                <span>Card</span>
              </DropdownMenuRadioItem>
            )}

            {canShowMosaic && (
              <DropdownMenuRadioItem
                className="inline-flex space-x-1 w-full"
                value="mosaic"
                onClick={() => handleStyleChange(E_TABLE_STYLE.MOSAIC)}
              >
                <LayoutDashboard className="size-4" />
                <span>Mosaico</span>
              </DropdownMenuRadioItem>
            )}

            {canShowKanban && (
              <DropdownMenuRadioItem
                className="inline-flex space-x-1 w-full"
                value="kanban"
                onClick={() => handleStyleChange(E_TABLE_STYLE.KANBAN)}
              >
                <LayoutDashboard className="size-4" />
                <span>Kanban</span>
              </DropdownMenuRadioItem>
            )}

            {canShowForum && (
              <DropdownMenuRadioItem
                className="inline-flex space-x-1 w-full"
                value={E_TABLE_STYLE.FORUM}
                onClick={() => handleStyleChange(E_TABLE_STYLE.FORUM)}
              >
                <MessageCircle className="size-4" />
                <span>Forum</span>
              </DropdownMenuRadioItem>
            )}

            {canShowCalendar && (
              <DropdownMenuRadioItem
                className="inline-flex space-x-1 w-full"
                value={E_TABLE_STYLE.CALENDAR}
                onClick={() => handleStyleChange(E_TABLE_STYLE.CALENDAR)}
              >
                <CalendarIcon className="size-4" />
                <span>Calendario</span>
              </DropdownMenuRadioItem>
            )}

            {canShowGantt && (
              <DropdownMenuRadioItem
                className="inline-flex space-x-1 w-full"
                value={E_TABLE_STYLE.GANTT}
                onClick={() => handleStyleChange(E_TABLE_STYLE.GANTT)}
              >
                <GanttChartIcon className="size-4" />
                <span>Gantt</span>
              </DropdownMenuRadioItem>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
