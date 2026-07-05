import * as React from 'react';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Spinner } from '@/components/ui/spinner';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import type { IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

type FieldComboboxProps = {
  value?: string;
  onValueChange?: (value: string, slug?: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  tableSlug: string;
};

export function FieldCombobox({
  value = '',
  onValueChange,
  placeholder = 'Selecione um campo...',
  className,
  disabled = false,
  tableSlug,
}: FieldComboboxProps): React.JSX.Element {
  const { data, status } = useReadTable({ slug: tableSlug });
  const fields = data?.fields ?? [];

  // Find selected field
  const selectedField = React.useMemo(() => {
    return fields.find((f) => f._id === value) ?? null;
  }, [fields, value]);

  return (
    <Combobox
      data-slot="field-combobox"
      data-test-id="field-combobox"
      items={fields}
      value={selectedField}
      onValueChange={(field: IField | null) => {
        onValueChange?.(field?._id ?? '', field?.slug);
      }}
      itemToStringLabel={(field: IField) => resolveFieldLabel(field)}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={
          (selectedField && resolveFieldLabel(selectedField)) || placeholder
        }
        showClear={!!selectedField}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum campo encontrado.</ComboboxEmpty>
        {status === 'pending' && (
          <div className="flex items-center justify-center p-3">
            <Spinner className="opacity-50" />
          </div>
        )}
        {status === 'success' && (
          <ComboboxList>
            {(field: IField): React.ReactNode => (
              <ComboboxItem
                key={field._id}
                value={field}
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {resolveFieldLabel(field)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {field.slug}
                  </span>
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
