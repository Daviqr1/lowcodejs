import * as React from 'react';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IDropdown } from '@/lib/interfaces';

type TableFieldDropdownDefaultValueProps = {
  label?: string;
  disabled?: boolean;
  dropdown: Array<IDropdown>;
};

export function TableFieldDropdownDefaultValue({
  label = 'Valor padrão',
  disabled,
  dropdown,
}: TableFieldDropdownDefaultValueProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  // O valor é o id do item selecionado, ou '' para nenhum
  const value = field.state.value ?? '';

  const handleChange = (val: string): void => {
    // '__none__' representa "sem valor padrão"
    let nextValue = val;
    if (val === '__none__') {
      nextValue = '';
    }
    field.handleChange(nextValue);
    field.handleBlur();
  };

  return (
    <Field
      data-slot="table-field-dropdown-default-value"
      data-test-id="table-field-dropdown-default-value"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={value || '__none__'}
        onValueChange={handleChange}
        disabled={disabled || dropdown.length === 0}
      >
        <SelectTrigger id={field.name}>
          <SelectValue placeholder="Sem valor padrão" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">Sem valor padrão</span>
          </SelectItem>
          {dropdown.map((opt) => (
            <SelectItem
              key={opt.id}
              value={opt.id}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
