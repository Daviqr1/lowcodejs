import React from 'react';

import { TableRowFieldLabel } from './table-row-field-label';

import { GroupCombobox } from '@/components/common/selectors/group-combobox';
import { GroupMultiSelect } from '@/components/common/selectors/group-multi-select';
import { Field, FieldError } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

type TableRowUserGroupFieldProps = {
  field: IField;
  disabled?: boolean;
};

// Valor do campo = Array<string> de ids de grupo (igual DROPDOWN/CATEGORY).
// Reusa os selectors de grupo prontos (GroupMultiSelect/GroupCombobox) em vez
// de reimplementar busca/scroll.
export function TableRowUserGroupField({
  field,
  disabled,
}: TableRowUserGroupFieldProps): React.JSX.Element {
  const formField = useFieldContext<Array<string>>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;

  const selectedIds = React.useMemo(() => {
    const value: unknown = formField.state.value;
    if (Array.isArray(value)) {
      return value.filter((id): id is string => typeof id === 'string');
    }
    if (value) return [String(value)];
    return [];
  }, [formField.state.value]);

  const placeholder = `Selecione ${resolveFieldLabel(field, 'form').toLowerCase()}`;

  let singleValue = '';
  if (selectedIds.length > 0) singleValue = selectedIds[0];

  return (
    <Field
      data-slot="table-row-user-group-field"
      data-test-id="table-row-user-group"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      {field.multiple && (
        <GroupMultiSelect
          value={selectedIds}
          onValueChange={(ids) => formField.handleChange(ids)}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      {!field.multiple && (
        <GroupCombobox
          value={singleValue}
          onValueChange={(id) => {
            let nextValue: Array<string> = [];
            if (id) nextValue = [id];
            formField.handleChange(nextValue);
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={formField.state.meta.errors}
        />
      )}
    </Field>
  );
}
