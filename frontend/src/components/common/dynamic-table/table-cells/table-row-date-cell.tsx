import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { E_FIELD_TYPE } from '@/lib/constant';
import { formatDate } from '@/lib/format-date';
import type { IField, IRow } from '@/lib/interfaces';

interface TableRowDateCellProps {
  row: IRow;
  field: IField;
}

export function TableRowDateCell({
  field,
  row,
}: TableRowDateCellProps): React.JSX.Element {
  const value = row[field.slug];

  let displayValue = '-';
  if (typeof value === 'string' && value) {
    if (
      field.type === E_FIELD_TYPE.CREATED_AT ||
      field.type === E_FIELD_TYPE.UPDATED_AT ||
      field.type === E_FIELD_TYPE.TRASHED_AT
    ) {
      displayValue = formatDate(value);
    } else {
      const dateFormat = field.format || 'dd/MM/yyyy';
      displayValue = format(value, dateFormat, { locale: ptBR });
    }
  }

  return (
    <p
      data-slot="table-row-date-cell"
      data-test-id="date-cell"
      className="text-muted-foreground text-sm"
    >
      {displayValue}
    </p>
  );
}
