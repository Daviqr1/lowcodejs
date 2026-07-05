import { AlertCircle, FileTextIcon } from 'lucide-react';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingRead } from '@/hooks/tanstack-query/use-setting-read';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import { TABLE_NAME_REGEX } from '@/lib/constant';
import { cn } from '@/lib/utils';

export const CloneTableBodySchema = z.object({
  name: z
    .string({ message: 'O nome é obrigatório' })
    .trim()
    .min(1, 'O nome é obrigatório')
    .max(40, 'O nome deve ter no máximo 40 caracteres'),

  MODEL_CLONE_TABLES: z
    .string({ message: 'O modelo é obrigatório' })
    .trim()
    .min(1, 'Selecione um modelo'),
});

export type CloneTableFormValues = {
  name: string;
  MODEL_CLONE_TABLES: string;
};

export const cloneTableFormDefaultValues: CloneTableFormValues = {
  name: '',
  MODEL_CLONE_TABLES: '',
};

export const CloneTableFormFields = withForm({
  defaultValues: cloneTableFormDefaultValues,
  props: {
    isPending: false,
  },
  render: function Render({ form, isPending }) {
    const { data: settings, isLoading: isLoadingSettings } = useSettingRead();

    let allowedTables: NonNullable<typeof settings>['MODEL_CLONE_TABLES'] = [];
    if (Array.isArray(settings?.MODEL_CLONE_TABLES)) {
      allowedTables = settings.MODEL_CLONE_TABLES;
    }

    if (isLoadingSettings) {
      return (
        <section className="space-y-4 p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </section>
      );
    }

    return (
      <section
        data-test-id="table-clone-form-fields"
        className="space-y-4 p-2"
      >
        {/* Campo Nome */}
        <form.AppField
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'Nome é obrigatório';
              }
              if (value.length > 40) {
                return 'Nome deve ter no máximo 40 caracteres';
              }
              if (!TABLE_NAME_REGEX.test(value)) {
                return {
                  message: 'O nome não pode conter caracteres especiais',
                };
              }
              return undefined;
            },
            onBlur: ({ value }) => {
              if (!value || value.trim() === '') {
                return 'Nome é obrigatório';
              }
              if (value.length > 40) {
                return 'Nome deve ter no máximo 40 caracteres';
              }
              if (!TABLE_NAME_REGEX.test(value)) {
                return {
                  message: 'O nome não pode conter caracteres especiais',
                };
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <field.FieldText
              label="Nome"
              placeholder="Digite o nome da tabela"
              disabled={isPending}
              icon={<FileTextIcon />}
              required
            />
          )}
        </form.AppField>

        {/* Campo Modelo - usando tabelas populadas diretamente */}
        <form.AppField
          name="MODEL_CLONE_TABLES"
          validators={{
            onChange: ({ value }) => {
              if (!value) {
                return 'Selecione um modelo';
              }
            },
            onBlur: ({ value }) => {
              if (!value) {
                return 'Selecione um modelo';
              }
            },
          }}
        >
          {() => (
            <ModelSelectField
              tables={allowedTables}
              disabled={isPending}
            />
          )}
        </form.AppField>
      </section>
    );
  },
});

type ModelSelectFieldProps = {
  tables: Array<{
    _id: string;
    name: string;
    slug: string;
    description: string | null;
  }>;
  disabled?: boolean;
};

function ModelSelectField({
  tables,
  disabled,
}: ModelSelectFieldProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  if (tables.length === 0) {
    return (
      <Field>
        <FieldLabel>
          Modelo <span className="text-destructive">*</span>
        </FieldLabel>
        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            Nenhum modelo disponível para clonagem. Configure os modelos nas
            configurações do sistema.
          </AlertDescription>
        </Alert>
      </Field>
    );
  }

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel>
        Modelo <span className="text-destructive">*</span>
      </FieldLabel>
      <Select
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
          field.handleBlur();
        }}
        disabled={disabled}
      >
        <SelectTrigger
          data-test-id="clone-model-select"
          className={cn(isInvalid && 'border-destructive')}
        >
          <SelectValue placeholder="Selecione o modelo..." />
        </SelectTrigger>
        <SelectContent>
          {tables.map((table) => (
            <SelectItem
              key={table._id}
              value={table._id}
            >
              {table.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
