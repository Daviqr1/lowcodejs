import { HashIcon } from 'lucide-react';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';

type TableFieldVisibleChipsLimitProps = {
  label?: string;
  disabled?: boolean;
};

// Diferente do `FieldNumber` generico: aqui o vazio precisa continuar `null`
// ("sem limite") em vez de virar 0.
export function TableFieldVisibleChipsLimit({
  label = 'Limite de chips exibidos',
  disabled,
}: TableFieldVisibleChipsLimitProps): React.JSX.Element {
  const field = useFieldContext<number | null>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field
      data-slot="table-field-visible-chips-limit"
      data-test-id="table-field-visible-chips-limit"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          data-test-id="table-field-visible-chips-limit-input"
          id={field.name}
          name={field.name}
          type="number"
          min={1}
          placeholder="Sem limite (exibe todos)"
          disabled={disabled}
          value={field.state.value ?? ''}
          onBlur={field.handleBlur}
          onChange={(e) => {
            let limit: number | null = null;
            if (e.target.value) limit = e.target.valueAsNumber;
            if (Number.isNaN(limit)) limit = null;
            field.handleChange(limit);
          }}
          aria-invalid={isInvalid}
        />
        <InputGroupAddon>
          <HashIcon />
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription>
        Quantidade de itens selecionados exibidos antes de resumir o restante em
        "+N". Deixe vazio para exibir todos.
      </FieldDescription>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
