import z from 'zod';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { withForm } from '@/integrations/tanstack-form/form-hook';
import type { ITable } from '@/lib/interfaces';

/**
 * Validates if code is in IIFE format: (async () => { ... })();
 */
function isValidIIFE(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true; // empty is valid
  return trimmed.startsWith('(async') && trimmed.endsWith('})();');
}

const iifeValidation = z.string().refine(isValidIIFE, {
  message: 'O codigo deve estar no formato IIFE: (async () => { ... })();',
});

export const TableMethodsSchema = z.object({
  onLoad: iifeValidation.default(''),
  beforeSave: iifeValidation.default(''),
  afterSave: iifeValidation.default(''),
});

export type TableMethodsFormValues = z.infer<typeof TableMethodsSchema>;

export const tableMethodsFormDefaultValues: TableMethodsFormValues = {
  onLoad: '',
  beforeSave: '',
  afterSave: '',
};

export const MethodsFormFields = withForm({
  defaultValues: tableMethodsFormDefaultValues,
  props: {
    isPending: false,
    // withForm infere o tipo do prop pelo default; a asserção define o tipo.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    table: null as ITable | null,
  },
  render: function Render({ form, table }) {
    return (
      <div
        className="p-2"
        data-test-id="methods-form"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Configure scripts JavaScript que serão executados em diferentes
          momentos do ciclo de vida do registro.
        </p>

        <Tabs
          defaultValue="onLoad"
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger
              value="onLoad"
              className="flex-1"
            >
              Ao Carregar
            </TabsTrigger>
            <TabsTrigger
              value="beforeSave"
              className="flex-1"
            >
              Antes de Salvar
            </TabsTrigger>
            <TabsTrigger
              value="afterSave"
              className="flex-1"
            >
              Após Salvar
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="onLoad"
            className="mt-4"
          >
            <form.AppField name="onLoad">
              {(field) => (
                <field.FieldCodeEditor
                  label="Ao Carregar (OnLoad)"
                  table={table ?? undefined}
                  hook="onLoad"
                />
              )}
            </form.AppField>
            <p className="text-sm text-muted-foreground mt-2">
              Executado quando o formulário é carregado. Use para pré-preencher
              campos ou aplicar regras de negócio iniciais.
            </p>
          </TabsContent>

          <TabsContent
            value="beforeSave"
            className="mt-4"
          >
            <form.AppField name="beforeSave">
              {(field) => (
                <field.FieldCodeEditor
                  label="Antes de Salvar (BeforeSave)"
                  table={table ?? undefined}
                  hook="beforeSave"
                />
              )}
            </form.AppField>
            <p className="text-sm text-muted-foreground mt-2">
              Executado antes de salvar o registro. Use para validações
              customizadas ou transformações de dados.
            </p>
          </TabsContent>

          <TabsContent
            value="afterSave"
            className="mt-4"
          >
            <form.AppField name="afterSave">
              {(field) => (
                <field.FieldCodeEditor
                  label="Após Salvar (AfterSave)"
                  table={table ?? undefined}
                  hook="afterSave"
                />
              )}
            </form.AppField>
            <p className="text-sm text-muted-foreground mt-2">
              Executado após salvar o registro. Use para enviar notificações,
              atualizar registros relacionados ou executar ações pós-salvamento.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    );
  },
});
