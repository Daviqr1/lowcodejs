import { ContentViewer } from '@/components/common/rich-editor';
import { E_FIELD_FORMAT } from '@/lib/constant';
import type { IField, IRow } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

interface TableRowTextLongCellProps {
  row: IRow;
  field: IField;
  className?: string;
}

export function TableRowTextLongCell({
  field,
  row,
  className,
}: TableRowTextLongCellProps): React.JSX.Element {
  const raw = row[field.slug];
  let value = '';
  if (typeof raw === 'string') value = raw;
  const isRenderedMarkdown = field.format === E_FIELD_FORMAT.RICH_TEXT;

  if (!value) {
    return (
      <span
        data-test-id="text-long-cell"
        className="text-muted-foreground text-sm"
      >
        -
      </span>
    );
  }

  if (isRenderedMarkdown) {
    return (
      <ContentViewer
        data-slot="table-row-text-long-cell"
        data-test-id="text-long-cell"
        content={value}
      />
    );
  }

  return (
    <p
      data-slot="table-row-text-long-cell"
      data-test-id="text-long-cell"
      className={cn('text-muted-foreground text-sm', className)}
    >
      {value}
    </p>
  );
}
