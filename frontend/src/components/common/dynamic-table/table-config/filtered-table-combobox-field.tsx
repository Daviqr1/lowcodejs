import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { TableComboboxFilteredSafe } from '@/components/common/dynamic-table/table-selectors/table-combobox-filtered';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useTablesReadPaginatedInfinite } from '@/hooks/tanstack-query/use-tables-read-paginated-infinite';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type SelectOption = {
  value: string;
  label: string;
};

type FilteredTableComboboxFieldProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;

  /** IDs permitidos (vindos do settings) */
  allowedTableIds: Array<string>;

  mapOption?: (table: { _id: string; name: string }) => SelectOption;
};

export function FilteredTableComboboxField({
  label,
  placeholder,
  disabled,
  required,
  allowedTableIds,
  mapOption,
}: FilteredTableComboboxFieldProps): React.JSX.Element | null {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  /**
   * Normaliza os IDs permitidos
   * - remove espaços
   * - garante string
   */
  const normalizedAllowedIds = useMemo(
    () => allowedTableIds.map((id) => String(id).trim()),
    [allowedTableIds],
  );

  /**
   * Busca as tabelas diretamente com _ids filtrados. Como este combobox
   * recebe opções prontas (sem "Carregar mais"), disparamos todas as
   * páginas automaticamente abaixo.
   */
  let paginatedParams: { _ids?: Array<string>; perPage: number } = {
    perPage: 50,
  };
  if (normalizedAllowedIds.length > 0) {
    paginatedParams = { _ids: normalizedAllowedIds, perPage: 50 };
  }
  const { data, status, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useTablesReadPaginatedInfinite(paginatedParams);

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const tables = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data?.pages],
  );

  /**
   * Mapeia para options
   */
  const options: Array<SelectOption> = useMemo(() => {
    return tables.map((t) => {
      if (mapOption) {
        return mapOption(t);
      }
      return {
        value: t._id,
        label: t.name,
      };
    });
  }, [tables, mapOption]);

  /**
   * Não renderiza nada enquanto ainda não há IDs permitidos
   * (evita listar tudo no primeiro render)
   */
  if (normalizedAllowedIds.length === 0) {
    return null;
  }

  if (status === 'pending') {
    return (
      <Field
        data-slot="filtered-table-combobox-field"
        data-test-id="filtered-table-combobox-field"
      >
        <FieldLabel>
          {label} {required && <span className="text-destructive">*</span>}
        </FieldLabel>
        <div className="flex items-center justify-center p-3">
          <Spinner className="opacity-50" />
        </div>
      </Field>
    );
  }

  if (options.length === 0) {
    return (
      <Field
        data-slot="filtered-table-combobox-field"
        data-test-id="filtered-table-combobox-field"
      >
        <FieldLabel>
          {label} {required && <span className="text-destructive">*</span>}
        </FieldLabel>

        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            Nenhum registro disponível para seleção.
          </AlertDescription>
        </Alert>
      </Field>
    );
  }

  return (
    <Field
      data-slot="filtered-table-combobox-field"
      data-test-id="filtered-table-combobox-field"
      data-invalid={isInvalid}
    >
      <FieldLabel>
        {label} {required && <span className="text-destructive">*</span>}
      </FieldLabel>

      {/* key força o TableCombobox a respeitar a lista filtrada */}
      <TableComboboxFilteredSafe
        key={options.map((o) => o.value).join('|')}
        options={options}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
          field.handleBlur();
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(isInvalid && 'border-destructive')}
      />

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
