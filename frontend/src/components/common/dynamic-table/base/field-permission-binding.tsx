import { PermissionBindingSelect } from '@/components/common/selectors/permission-binding-select';
import { Field, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IPermissionBinding } from '@/lib/interfaces';

type FieldPermissionBindingProps = {
  label: string;
  description?: string;
  disabled?: boolean;
};

export function FieldPermissionBinding({
  label,
  description,
  disabled,
}: FieldPermissionBindingProps): React.JSX.Element {
  const field = useFieldContext<IPermissionBinding>();

  return (
    <Field
      data-slot="field-permission-binding"
      data-test-id="field-permission-binding"
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
      <PermissionBindingSelect
        disabled={disabled}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
        }}
        aria-label={label}
      />
    </Field>
  );
}
