import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';

export function CreateTableFormSkeleton(): React.JSX.Element {
  return (
    <section className="space-y-4 p-4">
      {/* Upload de logo */}
      <Skeleton className="h-32 w-full rounded-md" />

      {/* Campo Nome */}
      <Field>
        <FieldLabel>
          <Skeleton className="h-4 w-12" />
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            disabled
            className="opacity-50"
          />
          <InputGroupAddon>
            <Skeleton className="size-5 rounded" />
          </InputGroupAddon>
        </InputGroup>
      </Field>

      {/* Campo Estilo */}
      <Field>
        <FieldLabel>
          <Skeleton className="h-4 w-40" />
        </FieldLabel>
        <Skeleton className="h-10 w-full rounded-md" />
      </Field>
    </section>
  );
}
