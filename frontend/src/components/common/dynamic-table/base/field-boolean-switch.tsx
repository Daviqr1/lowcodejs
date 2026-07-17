import { FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type FieldBooleanSwitchProps = {
  label: string;
  description?: string;
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
};

export function FieldBooleanSwitch({
  label,
  description,
  disabled,
  yesLabel = 'Sim',
  noLabel = 'Não',
  className,
}: FieldBooleanSwitchProps): React.JSX.Element {
  const field = useFieldContext<boolean>();

  return (
    <div
      data-slot="field-boolean-switch"
      data-test-id="field-boolean-switch"
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3',
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="inline-flex space-x-2 items-center">
        <span className="text-sm text-muted-foreground">{noLabel}</span>
        <Switch
          data-test-id="field-boolean-switch"
          id={field.name}
          aria-label={label}
          disabled={disabled}
          checked={field.state.value}
          onCheckedChange={(checked) => {
            field.handleChange(checked);
          }}
        />
        <span className="text-sm text-muted-foreground">{yesLabel}</span>
      </div>
    </div>
  );
}
