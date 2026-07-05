import React from 'react';

import { TableRowFieldLabel } from './table-row-field-label';

import type { TreeNode } from '@/components/common/tree-editor/tree-list';
import { TreeList } from '@/components/common/tree-editor/tree-list';
import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { ICategory, IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';
import { cn } from '@/lib/utils';

type TableRowCategoryFieldProps = {
  field: IField;
  disabled?: boolean;
};

function convertCategoriesToTreeNodes(
  categories: Array<ICategory>,
): Array<TreeNode> {
  return categories.map((cat) => {
    let children: Array<TreeNode> = [];
    if (cat.children.length > 0) {
      children = convertCategoriesToTreeNodes(cat.children);
    }
    return {
      id: cat.id,
      label: cat.label,
      children,
    };
  });
}

function findCategoryLabel(
  categoryId: string,
  categories: Array<ICategory>,
): string | null {
  for (const cat of categories) {
    if (cat.id === categoryId) return cat.label;
    if (cat.children.length > 0) {
      const found = findCategoryLabel(categoryId, cat.children);
      if (found) return found;
    }
  }
  return null;
}

export function TableRowCategoryField({
  field,
  disabled,
}: TableRowCategoryFieldProps): React.JSX.Element {
  const formField = useFieldContext<Array<string>>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;

  const categories = field.category ?? [];
  const treeData = convertCategoriesToTreeNodes(categories);

  const selectedIds = React.useMemo(() => {
    const value: unknown = formField.state.value;
    if (Array.isArray(value)) return value;
    if (value) return [String(value)];
    return [];
  }, [formField.state.value]);

  const selectedLabel = React.useMemo(() => {
    const value: unknown = formField.state.value;
    let values: Array<string> = [];
    if (Array.isArray(value)) {
      values = value;
    } else if (value) {
      values = [String(value)];
    }
    const labels = values
      .map((id) => findCategoryLabel(id, categories))
      .filter(Boolean);
    if (labels.length > 0) {
      return labels.join(', ');
    }
    return null;
  }, [formField.state.value, categories]);

  return (
    <Field
      data-slot="table-row-category-field"
      data-test-id="table-row-category"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            data-test-id="table-row-category"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !selectedLabel && 'text-muted-foreground',
            )}
          >
            {selectedLabel ||
              `Selecione ${resolveFieldLabel(field, 'form').toLowerCase()}`}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-2"
          align="start"
        >
          <TreeList
            data={treeData}
            selectedIds={selectedIds}
            onSelectionChange={(ids) => {
              if (!field.multiple) {
                const [id] = ids;
                let nextValue: Array<string> = [];
                if (id) {
                  nextValue = [id];
                }
                formField.handleChange(nextValue);
              }

              if (field.multiple) {
                formField.handleChange(ids);
              }
            }}
            multiSelect={field.multiple}
            showCheckboxes={field.multiple}
          />
        </PopoverContent>
      </Popover>
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={formField.state.meta.errors}
        />
      )}
    </Field>
  );
}
