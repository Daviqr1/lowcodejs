import { FolderTreeIcon } from 'lucide-react';

import { MenuCombobox } from '@/components/common/selectors/menu-combobox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type FieldMenuComboboxProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  excludeId?: string;
};

export function FieldMenuCombobox({
  label,
  placeholder,
  disabled,
  excludeId,
}: FieldMenuComboboxProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  return (
    <Field
      data-slot="field-menu-combobox"
      data-test-id="field-menu-combobox"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputGroup>
        <MenuCombobox
          data-test-id="field-menu-combobox"
          disabled={disabled}
          value={field.state.value}
          onValueChange={(value) => {
            field.handleChange(value);
          }}
          placeholder={placeholder}
          excludeId={excludeId}
          className={cn(isInvalid && 'border-destructive')}
          aria-label={label}
        />
        <InputGroupAddon>
          <FolderTreeIcon />
        </InputGroupAddon>
      </InputGroup>
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={field.state.meta.errors}
        />
      )}
    </Field>
  );
}
