import { PlusIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import type { SortableChipItem } from '@/components/ui/combobox';
import { ComboboxSortableChips } from '@/components/ui/combobox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { getNextDropdownOptionColor } from '@/lib/dropdown-colors';
import type { IDropdown } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type TableFieldDropdownOptionsProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function TableFieldDropdownOptions({
  label,
  placeholder = 'Adicionar opção...',
  disabled,
  required,
}: TableFieldDropdownOptionsProps): React.JSX.Element {
  const field = useFieldContext<Array<IDropdown>>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const [inputValue, setInputValue] = React.useState('');

  const optionById = React.useMemo(() => {
    return new Map(field.state.value.map((o) => [o.id, o] as const));
  }, [field.state.value]);

  const sortableItems: Array<SortableChipItem> = React.useMemo(() => {
    return field.state.value.map((opt) => ({
      id: opt.id,
      label: String(opt.label),
    }));
  }, [field.state.value]);

  const handleAddOption = (): void => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const exists = field.state.value.some(
      (opt) => opt.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;

    const newOption: IDropdown = {
      id: crypto.randomUUID(),
      label: trimmed,
      color: getNextDropdownOptionColor(field.state.value.length),
    };

    field.handleChange([...field.state.value, newOption]);
    field.handleBlur();
    setInputValue('');
  };

  const handleRemoveOption = (optionId: string): void => {
    field.handleChange(field.state.value.filter((opt) => opt.id !== optionId));
    field.handleBlur();
  };

  const handleReorder = (newItems: Array<SortableChipItem>): void => {
    const reorderedOptions: Array<IDropdown> = newItems.map((item) => {
      const prev = optionById.get(item.id);
      return {
        id: item.id,
        label: String(item.label),
        color: prev?.color ?? null,
      };
    });
    field.handleChange(reorderedOptions);
  };

  const setColor = (id: string, color?: string): void => {
    field.handleChange(
      field.state.value.map((opt) => {
        if (opt.id === id) {
          return { ...opt, color: color ?? null };
        }
        return opt;
      }),
    );
  };

  const handleLabelChange = (id: string, newLabel: string): void => {
    field.handleChange(
      field.state.value.map((opt) => {
        if (opt.id === id) {
          return { ...opt, label: newLabel };
        }
        return opt;
      }),
    );
    field.handleBlur();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  let onRemoveHandler: ((id: string) => void) | undefined = undefined;
  if (!disabled) {
    onRemoveHandler = handleRemoveOption;
  }

  let onLabelChangeHandler: ((id: string, label: string) => void) | undefined =
    undefined;
  if (!disabled) {
    onLabelChangeHandler = handleLabelChange;
  }

  return (
    <Field
      data-slot="table-field-dropdown-options"
      data-test-id="table-field-dropdown-options"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>

      <ComboboxSortableChips
        items={sortableItems}
        onReorder={handleReorder}
        onRemove={onRemoveHandler}
        disabled={disabled}
        className={cn(isInvalid && 'border-destructive')}
        getItemColor={(id) => optionById.get(id)?.color ?? undefined}
        onItemColorChange={(id, color) => setColor(id, color)}
        onItemLabelChange={onLabelChangeHandler}
      >
        <div className="flex flex-1 items-center gap-1">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => field.handleBlur()}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="h-6 min-w-24 flex-1 border-none p-0 shadow-none focus-visible:ring-0"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-test-id="table-field-dropdown-options-add-btn"
            onClick={handleAddOption}
            disabled={disabled || !inputValue.trim()}
          >
            <PlusIcon className="h-3 w-3" />
          </Button>
        </div>
      </ComboboxSortableChips>

      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
