import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_RELATIONSHIP_ON_DELETE } from '@/lib/constant';
import { cn } from '@/lib/utils';

const ON_DELETE_LIST = [
  {
    label: 'Ao excluir: apenas desvincular (padrão)',
    value: E_RELATIONSHIP_ON_DELETE.SET_NULL,
  },
  {
    label: 'Ao excluir: remover os dependentes',
    value: E_RELATIONSHIP_ON_DELETE.CASCADE,
  },
  {
    label: 'Ao excluir: bloquear se houver vínculo',
    value: E_RELATIONSHIP_ON_DELETE.RESTRICT,
  },
];

type TableFieldRelationshipOnDeleteSelectProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function TableFieldRelationshipOnDeleteSelect({
  label,
  placeholder = 'Selecione o comportamento ao excluir',
  disabled,
  required,
}: TableFieldRelationshipOnDeleteSelectProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field
      data-slot="table-field-relationship-on-delete-select"
      data-test-id="table-field-relationship-on-delete-select"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Select
        disabled={disabled}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
      >
        <SelectTrigger className={cn(isInvalid && 'border-destructive')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {ON_DELETE_LIST.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
