import { CheckIcon, SearchIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { RenderRelationshipCell } from './relationship-rows-data-table';
import { otherIdOf } from './relationship-rows-inline';

import { Pagination } from '@/components/common/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useRelationshipLinkCreate } from '@/hooks/tanstack-query/use-relationship-link-create';
import { useRelationshipLinksList } from '@/hooks/tanstack-query/use-relationship-links-list';
import { useRelationshipRowsReadPaginated } from '@/hooks/tanstack-query/use-relationship-rows-read-paginated';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFieldVisibility } from '@/hooks/use-field-visibility';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRow, ITable } from '@/lib/interfaces';

interface RelationshipSelectExistingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: IField;
  relatedTable: ITable;
  parentTableSlug: string;
  relationshipId: string;
  side: 'source' | 'target';
  recordId: string;
  onChanged: () => void;
}

export function RelationshipSelectExistingSheet(
  props: RelationshipSelectExistingSheetProps,
): React.JSX.Element {
  return (
    <Sheet
      data-slot="relationship-select-existing-sheet"
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full gap-0 p-0 flex flex-col"
      >
        <RelationshipSelectExistingSheetContent {...props} />
      </SheetContent>
    </Sheet>
  );
}

function RelationshipSelectExistingSheetContent({
  field,
  relatedTable,
  parentTableSlug,
  relationshipId,
  side,
  recordId,
  onChanged,
}: RelationshipSelectExistingSheetProps): React.JSX.Element {
  const { isFieldVisible } = useFieldVisibility();
  const [search, setSearch] = React.useState<string>('');
  const [page, setPage] = React.useState<number>(1);
  const perPage = 10;

  const debouncedSearch = useDebouncedValue(search, 300);

  React.useEffect((): void => {
    setPage(1);
  }, [debouncedSearch]);

  const rowsQuery = useRelationshipRowsReadPaginated({
    tableSlug: relatedTable.slug,
    fieldSlug: field.slug,
    search: debouncedSearch || undefined,
    page,
    perPage,
    // Auto-relacionamento: não oferecer o próprio registro como candidato.
    // No-op quando a tabela-alvo é outra (o _id nunca aparece na lista).
    ...(recordId && { excludeSelfId: recordId }),
  });

  const linksQuery = useRelationshipLinksList({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    page: 1,
    perPage: 200,
  });

  const linkedIds = React.useMemo((): Set<string> => {
    const ids = new Set<string>();
    const links = linksQuery.data?.data ?? [];
    for (const link of links) {
      ids.add(otherIdOf(link, side));
    }
    return ids;
  }, [linksQuery.data?.data, side]);

  const createLink = useRelationshipLinkCreate({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    onSuccess(): void {
      onChanged();
    },
    onError(): void {
      toast.error('Não foi possível vincular o registro');
    },
  });

  const columnFields = React.useMemo((): Array<IField> => {
    return (relatedTable.fields ?? []).filter(
      (f: IField): boolean =>
        !f.trashed &&
        !f.native &&
        f.type !== E_FIELD_TYPE.FIELD_GROUP &&
        f.type !== E_FIELD_TYPE.RELATIONSHIP &&
        f.type !== E_FIELD_TYPE.STATUS &&
        f.type !== E_FIELD_TYPE.TRASHED_AT &&
        isFieldVisible(f, 'list'),
    );
  }, [relatedTable.fields, isFieldVisible]);

  const rows = rowsQuery.data?.data ?? [];
  const meta = rowsQuery.data?.meta ?? {
    total: 0,
    page,
    perPage,
    lastPage: 1,
    firstPage: 1,
  };

  function handleLink(row: IRow): void {
    const otherId = String(row._id ?? '');
    if (!otherId || linkedIds.has(otherId) || createLink.isPending) return;
    createLink.mutate({ otherId });
  }

  return (
    <React.Fragment>
      <SheetHeader className="px-4 pt-4 pb-0">
        <SheetTitle>Vincular existente</SheetTitle>
        <SheetDescription className="sr-only">
          Selecione um registro existente para vincular
        </SheetDescription>
      </SheetHeader>

      <div className="px-4 py-3">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-8"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
              setSearch(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4">
        {rowsQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner className="opacity-50" />
          </div>
        )}

        {!rowsQuery.isLoading && (
          <div className="w-full overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {columnFields.map((cf) => (
                    <th
                      key={cf._id}
                      className="px-4 py-2 text-left text-xs font-medium text-muted-foreground"
                    >
                      {cf.name}
                    </th>
                  ))}
                  <th className="w-16 px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnFields.length + 1}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum registro encontrado
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const rowId = String(row._id ?? '');
                  const alreadyLinked = linkedIds.has(rowId);
                  return (
                    <tr
                      key={rowId}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      {columnFields.map((cf) => (
                        <td
                          key={cf._id}
                          className="px-4 py-2"
                        >
                          <RenderRelationshipCell
                            field={cf}
                            row={row}
                          />
                        </td>
                      ))}
                      <td className="w-16 px-4 py-2">
                        {alreadyLinked && (
                          <CheckIcon className="size-4 text-muted-foreground mx-auto" />
                        )}
                        {!alreadyLinked && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={createLink.isPending}
                            onClick={(): void => handleLink(row)}
                          >
                            Vincular
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta.total > perPage && (
        <div className="px-4 py-3 border-t">
          <Pagination
            meta={meta}
            page={page}
            perPage={perPage}
            onPageChange={(nextPage: number): void => setPage(nextPage)}
            onPerPageChange={(): void => undefined}
          />
        </div>
      )}
    </React.Fragment>
  );
}
