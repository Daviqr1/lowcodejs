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

type CategoryNode = {
  id: string;
  label: string;
  children?: Array<CategoryNode>;
};

interface TableFieldCategoryDefaultValueProps {
  label?: string;
  disabled?: boolean;
  categories: Array<CategoryNode>;
}

type FlatCategory = {
  id: string;
  label: string;
};

function flattenCategories(
  nodes: Array<CategoryNode>,
  prefix: string = '',
): Array<FlatCategory> {
  const result: Array<FlatCategory> = [];

  for (const node of nodes) {
    let fullLabel = node.label;
    if (prefix) fullLabel = `${prefix} > ${node.label}`;
    result.push({ id: node.id, label: fullLabel });

    if (node.children?.length) {
      result.push(...flattenCategories(node.children, fullLabel));
    }
  }

  return result;
}

export function TableFieldCategoryDefaultValue({
  label = 'Valor padrão',
  disabled,
  categories,
}: TableFieldCategoryDefaultValueProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const value = field.state.value ?? '';

  const flatOptions = React.useMemo(
    () => flattenCategories(categories ?? []),
    [categories],
  );

  const handleChange = (val: string): void => {
    if (val === '__none__') {
      field.handleChange('');
    } else {
      field.handleChange(val);
    }
    field.handleBlur();
  };

  return (
    <Field
      data-slot="table-field-category-default-value"
      data-test-id="table-field-category-default-value"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={value || '__none__'}
        onValueChange={handleChange}
        disabled={disabled || flatOptions.length === 0}
      >
        <SelectTrigger id={field.name}>
          <SelectValue placeholder="Sem valor padrão" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">Sem valor padrão</span>
          </SelectItem>
          {flatOptions.map((opt) => (
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
