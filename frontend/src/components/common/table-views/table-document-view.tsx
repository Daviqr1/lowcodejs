import { pdf } from '@react-pdf/renderer';
import { GripVerticalIcon, PanelLeftIcon } from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DocumentMain } from '@/components/common/document/document-main';
import { DocumentPdf } from '@/components/common/document/document-pdf';
import { DocumentPrintButton } from '@/components/common/document/document-print-button';
import { DocumentSidebar } from '@/components/common/document/document-sidebar';
import { DocumentToc } from '@/components/common/document/document-toc';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CatNode } from '@/lib/document-helpers';
import {
  buildCategoryOrderMap,
  buildDepthMap,
  buildDescendantsMap,
  buildDocBlocks,
  buildLabelMap,
  firstCategoryField,
  getRowLeafId,
  headerSorter,
  rowHeadingLevelFromLeaf,
  rowIndentPxFromLeaf,
  rowLeafLabel,
  rowMatchesCategory,
} from '@/lib/document-helpers';
import type { IField, IRow, ITable } from '@/lib/interfaces';

const DEFAULT_SIDEBAR_WIDTH = 288; // w-72
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 600;

export function TableDocumentView({
  data,
  headers,
  order,
  tableSlug,
  table,
}: {
  data: Array<IRow>;
  headers: Array<IField>;
  order: Array<string>;
  tableSlug: string;
  table: ITable;
}): React.ReactElement {
  const categoryField = useMemo(
    () => firstCategoryField(headers, order, table.layoutFields),
    [headers, order, table.layoutFields],
  );
  const isMobile = useIsMobile();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent): void => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = sidebarWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [sidebarWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, startWidth.current + delta),
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (): void => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const tableQuery = useReadTable({ slug: tableSlug });

  const orderedHeaders = useMemo(
    () => headers.filter((h) => !h.trashed).sort(headerSorter(order)),
    [headers, order],
  );

  const docBlocks = useMemo(
    () => buildDocBlocks(orderedHeaders, table.layoutFields),
    [orderedHeaders, table.layoutFields],
  );

  const categoryTree: Array<CatNode> = useMemo(() => {
    if (!categoryField) return [];
    return categoryField.category;
  }, [categoryField]);

  const depthMap = useMemo(() => buildDepthMap(categoryTree), [categoryTree]);
  const labelMap = useMemo(() => buildLabelMap(categoryTree), [categoryTree]);

  const descendantsMap = useMemo(
    () => buildDescendantsMap(categoryTree),
    [categoryTree],
  );

  const filteredRows = useMemo(() => {
    if (!categoryField) return data;

    return data.filter((row) =>
      rowMatchesCategory(
        row,
        categoryField.slug,
        selectedCategoryId,
        descendantsMap,
      ),
    );
  }, [data, categoryField, selectedCategoryId, descendantsMap]);

  let filterLabel: string | null = null;
  if (selectedCategoryId) {
    filterLabel = labelMap.get(selectedCategoryId) ?? selectedCategoryId;
  }

  const getIndentPx = (row: IRow): number => {
    if (categoryField) {
      return rowIndentPxFromLeaf(row, categoryField.slug, depthMap);
    }
    return 0;
  };

  const getLeafLabel = (row: IRow): string | null => {
    if (categoryField) return rowLeafLabel(row, categoryField.slug, labelMap);
    return null;
  };

  const categoryOrderMap = useMemo(
    () => buildCategoryOrderMap(categoryTree),
    [categoryTree],
  );

  const sortedRows = useMemo(() => {
    if (!categoryField) return filteredRows;

    const slug = categoryField.slug;

    return [...filteredRows].sort((a, b) => {
      const leafA = getRowLeafId(a, slug);
      const leafB = getRowLeafId(b, slug);

      let ordA = Number.POSITIVE_INFINITY;
      if (leafA) ordA = categoryOrderMap.get(leafA) ?? Number.POSITIVE_INFINITY;
      let ordB = Number.POSITIVE_INFINITY;
      if (leafB) ordB = categoryOrderMap.get(leafB) ?? Number.POSITIVE_INFINITY;

      if (ordA !== ordB) return ordA - ordB;

      return String(a._id).localeCompare(String(b._id));
    });
  }, [filteredRows, categoryField, categoryOrderMap]);

  const getHeadingLevel = (row: IRow): number => {
    if (categoryField) {
      return rowHeadingLevelFromLeaf(row, categoryField.slug, depthMap);
    }
    return 2;
  };

  async function handlePrint(): Promise<void> {
    const blob = await pdf(
      <DocumentPdf
        title={tableQuery.data?.name ?? ''}
        categoryTitle={categoryField?.name ?? 'Sumario'}
        nodes={categoryTree}
        rows={sortedRows}
        blocks={docBlocks}
        categorySlug={categoryField?.slug ?? 'category'}
        getLeafLabel={getLeafLabel}
        getHeadingLevel={getHeadingLevel}
        getIndentPx={getIndentPx}
      />,
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tableSlug}-document.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  let sidebarPxWidth = 40;
  if (isSidebarOpen) sidebarPxWidth = sidebarWidth;

  // a view so roda com categoryField presente, mas o tipo permite undefined e
  // DocumentSidebar exige IField.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const sidebarCategoryField = categoryField ?? ({} as IField);

  return (
    <div
      className="relative flex h-[calc(100dvh-64px)] w-full overflow-hidden"
      data-test-id="table-document-view"
    >
      <DocumentPrintButton onClick={handlePrint} />

      {/* Sidebar inline (desktop) */}
      {!isMobile && (
        <>
          <div
            className="h-full shrink-0"
            style={{ width: sidebarPxWidth }}
          >
            <DocumentSidebar
              title={categoryField?.name ?? 'Índice'}
              nodes={categoryTree}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen((v) => !v)}
              categoryField={sidebarCategoryField}
            />
          </div>

          {/* Resize handle */}
          {isSidebarOpen && (
            <div
              role="separator"
              aria-orientation="vertical"
              className="flex w-1.5 shrink-0 cursor-col-resize items-center justify-center border-r transition-colors hover:bg-primary/10 active:bg-primary/20"
              onMouseDown={handleMouseDown}
            >
              <GripVerticalIcon className="size-3 text-muted-foreground" />
            </div>
          )}
        </>
      )}

      {/* Main content */}
      <div className="h-full min-w-0 flex-1 overflow-y-auto">
        {isMobile && (
          <div className="no-print sticky top-0 z-10 flex items-center gap-2 border-b bg-background py-2 pr-12 pl-3">
            <Sheet
              open={isMobileSidebarOpen}
              onOpenChange={setIsMobileSidebarOpen}
            >
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <PanelLeftIcon className="size-4" />
                  Índice
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 sm:max-w-sm"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>{categoryField?.name ?? 'Índice'}</SheetTitle>
                </SheetHeader>
                <DocumentSidebar
                  title={categoryField?.name ?? 'Índice'}
                  nodes={categoryTree}
                  selectedId={selectedCategoryId}
                  onSelect={(id) => {
                    setSelectedCategoryId(id);
                    setIsMobileSidebarOpen(false);
                  }}
                  isOpen
                  onToggle={() => setIsMobileSidebarOpen(false)}
                  categoryField={sidebarCategoryField}
                />
              </SheetContent>
            </Sheet>
          </div>
        )}
        <DocumentToc
          nodes={categoryTree}
          title={categoryField?.name ?? 'Sumário'}
        />
        <DocumentMain
          rows={sortedRows}
          total={data.length}
          filterLabel={filterLabel}
          blocks={docBlocks}
          getIndentPx={getIndentPx}
          getLeafLabel={getLeafLabel}
          getHeadingLevel={getHeadingLevel}
          categorySlug={categoryField?.slug ?? 'category'}
          selectedCategoryId={selectedCategoryId}
        />
      </div>
    </div>
  );
}
