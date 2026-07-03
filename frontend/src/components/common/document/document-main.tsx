import { useParams, useRouter } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import { DocumentHeadingRow } from './document-heading-row';
import { DocumentRow } from './document-row';

import { Button } from '@/components/ui/button';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useTablePermission } from '@/hooks/use-table-permission';
import type { DocBlock } from '@/lib/document-helpers';
import { getRowLeafId } from '@/lib/document-helpers';
import type { IRow } from '@/lib/interfaces';

interface DocumentMainProps {
  rows: Array<IRow>;
  total: number;
  filterLabel?: string | null;
  blocks: Array<DocBlock>;
  getIndentPx: (row: IRow) => number;
  getLeafLabel: (row: IRow) => string | null;
  getHeadingLevel: (row: IRow) => number;
  categorySlug: string;
  selectedCategoryId?: string | null;
}

export function DocumentMain({
  rows,
  total,
  filterLabel,
  blocks,
  getIndentPx,
  getLeafLabel,
  getHeadingLevel,
  categorySlug,
  selectedCategoryId,
}: DocumentMainProps): React.JSX.Element {
  const router = useRouter();
  const { slug } = useParams({
    from: '/_private/tables/$slug/',
  });

  const table = useReadTable({ slug });
  const permission = useTablePermission(table.data);

  return (
    <main
      data-slot="document-main"
      data-test-id="document-main"
      className="p-4 w-full"
    >
      <div className="no-print mb-3 flex flex-wrap items-center gap-3 pr-10">
        <div className="text-sm text-muted-foreground">
          Mostrando{' '}
          <span className="font-medium text-foreground">{rows.length}</span> de{' '}
          <span className="font-medium text-foreground">{total}</span>
        </div>

        {filterLabel && (
          <div className="text-sm">
            Filtro: <span className="font-medium">{filterLabel}</span>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div>
          {rows.map((row, index) => {
            let prevLeafId: string | null = null;
            if (index > 0) {
              prevLeafId = getRowLeafId(rows[index - 1], categorySlug);
            }
            const leafId = getRowLeafId(row, categorySlug);
            const showHeading = leafId !== prevLeafId;

            return (
              <DocumentRow
                key={row._id}
                row={row}
                blocks={blocks}
                indentPx={getIndentPx(row)}
                leafLabel={getLeafLabel(row)}
                headingLevel={getHeadingLevel(row)}
                categorySlug={categorySlug}
                showHeading={showHeading}
              />
            );
          })}
        </div>
      )}
      {rows.length === 0 && (
        <div>
          {filterLabel && selectedCategoryId && (
            <DocumentHeadingRow
              id={`sec-${selectedCategoryId}`}
              level={2}
              actions={
                permission.can('CREATE_ROW') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 cursor-pointer opacity-40 hover:opacity-100"
                    aria-label="Adicionar registro nesta seção"
                    onClick={() => {
                      router.navigate({
                        to: '/tables/$slug/row',
                        params: { slug },
                      });
                    }}
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                )
              }
            >
              {filterLabel}
            </DocumentHeadingRow>
          )}
          <div className="text-sm text-muted-foreground mt-2">
            Nenhum registro encontrado para este filtro.
          </div>
        </div>
      )}
    </main>
  );
}
