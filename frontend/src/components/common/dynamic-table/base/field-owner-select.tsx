import { UserMultiSelect } from '@/components/common/selectors/user-multi-select';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';

type FieldOwnerSelectProps = {
  label: string;
  disabled?: boolean;
};

// Troca de dono. Reusa o UserMultiSelect, mas mantém apenas a última seleção
// (comportamento single-select sobre o componente existente).
export function FieldOwnerSelect({
  label,
  disabled,
}: FieldOwnerSelectProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const value = field.state.value;

  const selected: Array<string> = [];
  if (value) selected.push(value);

  return (
    <Field
      data-slot="field-owner-select"
      data-test-id="field-owner-select"
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <FieldDescription>
        O dono tem acesso total à tabela e não pode ser removido.
      </FieldDescription>
      <UserMultiSelect
        disabled={disabled}
        value={selected}
        onValueChange={(ids) => {
          const last = ids[ids.length - 1];
          field.handleChange(last ?? '');
        }}
        placeholder="Selecione o dono..."
      />
    </Field>
  );
}
