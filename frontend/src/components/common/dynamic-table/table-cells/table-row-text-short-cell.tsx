import { E_FIELD_FORMAT } from '@/lib/constant';
import type { IField, IRow } from '@/lib/interfaces';

interface TableRowTextShortCellProps {
  row: IRow;
  field: IField;
}

export function TableRowTextShortCell({
  field,
  row,
}: TableRowTextShortCellProps): React.JSX.Element {
  const raw = row[field.slug];
  let value = '';
  if (typeof raw === 'string') value = raw;

  if (!value) {
    return (
      <p
        data-slot="table-row-text-short-cell"
        data-test-id="text-short-cell"
        className="text-muted-foreground text-sm block truncate"
      >
        -
      </p>
    );
  }

  if (field.format === E_FIELD_FORMAT.PASSWORD) {
    return (
      <p
        data-slot="table-row-text-short-cell"
        data-test-id="text-short-cell"
        className="text-muted-foreground text-sm block truncate"
      >
        ••••••••
      </p>
    );
  }

  if (field.format === E_FIELD_FORMAT.EMAIL) {
    return (
      <a
        data-slot="table-row-text-short-cell"
        data-test-id="text-short-cell"
        href={`mailto:${value}`}
        className="text-sm block truncate text-blue-600 hover:underline"
      >
        {value}
      </a>
    );
  }

  if (field.format === E_FIELD_FORMAT.URL) {
    return (
      <a
        data-slot="table-row-text-short-cell"
        data-test-id="text-short-cell"
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        title={value}
        className="text-sm block truncate max-w-[250px] text-blue-600 hover:underline"
      >
        {value}
      </a>
    );
  }

  return (
    <p
      data-slot="table-row-text-short-cell"
      data-test-id="text-short-cell"
      className="text-muted-foreground text-sm block truncate"
    >
      {value}
    </p>
  );
}
