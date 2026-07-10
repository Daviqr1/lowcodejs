import { FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_USER_STATUS } from '@/lib/constant';
import type { ValueOf } from '@/lib/interfaces';

type FieldSwitchProps = {
  label: string;
  description?: string;
  disabled?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
};

export function FieldSwitch({
  label,
  description,
  disabled,
  activeLabel = 'Ativo',
  inactiveLabel = 'Inativo',
}: FieldSwitchProps): React.JSX.Element {
  const field = useFieldContext<ValueOf<typeof E_USER_STATUS>>();

  return (
    <div
      data-slot="field-switch"
      data-test-id="field-switch"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3"
    >
      <div className="min-w-0 space-y-0.5">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="inline-flex space-x-2 items-center">
        <span className="text-sm text-muted-foreground">{inactiveLabel}</span>
        <Switch
          data-test-id="field-switch"
          id={field.name}
          aria-label={label}
          disabled={disabled}
          checked={field.state.value === E_USER_STATUS.ACTIVE}
          onCheckedChange={(checked) => {
            let nextStatus: ValueOf<typeof E_USER_STATUS> =
              E_USER_STATUS.INACTIVE;
            if (checked) {
              nextStatus = E_USER_STATUS.ACTIVE;
            }
            field.handleChange(nextStatus);
          }}
        />
        <span className="text-sm text-muted-foreground">{activeLabel}</span>
      </div>
    </div>
  );
}
