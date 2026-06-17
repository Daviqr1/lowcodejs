import { LoaderCircleIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBulkUpdateTableRows } from '@/hooks/tanstack-query/use-table-rows-bulk-update';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { E_FIELD_TYPE } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { IField, ITable, ValueOf } from '@/lib/interfaces';
import {
  buildCreateRowDefaultValues,
  buildFieldValidator,
  buildRowPayload,
} from '@/lib/table';
import { toastSuccess, toastWarning } from '@/lib/toast';

/**
 * Tipos de campo suportados na edicao em massa: status/dropdown + campos
 * simples. Exclui relacionamento, arquivo, grupo de campos, rich text,
 * reaction/evaluation e campos nativos (controles mais complexos).
 */
const BULK_EDITABLE_TYPES: Array<ValueOf<typeof E_FIELD_TYPE>> = [
  E_FIELD_TYPE.TEXT_SHORT,
  E_FIELD_TYPE.DATE,
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.CATEGORY,
  E_FIELD_TYPE.USER,
];

export function getBulkEditableFields(table?: ITable): Array<IField> {
  return (table?.fields ?? []).filter(
    (field) =>
      !field.native &&
      !field.trashed &&
      BULK_EDITABLE_TYPES.includes(field.type),
  );
}

interface BulkEditFieldDialogProps {
  slug: string;
  table?: ITable;
  selectedIds: Array<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkEditFieldDialog({
  slug,
  table,
  selectedIds,
  open,
  onOpenChange,
  onSuccess,
}: BulkEditFieldDialogProps): React.JSX.Element {
  const editableFields = React.useMemo(
    () => getBulkEditableFields(table),
    [table],
  );

  const [fieldId, setFieldId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setFieldId(null);
  }, [open]);

  const selectedField =
    editableFields.find((field) => field._id === fieldId) ?? null;

  const count = selectedIds.length;

  return (
    <Dialog
      modal={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="py-4 px-6">
        <DialogHeader>
          <DialogTitle>Editar campo em massa</DialogTitle>
          <DialogDescription>
            {count === 1
              ? '1 registro selecionado. '
              : `${count} registros selecionados. `}
            Escolha um campo e o novo valor a ser aplicado.
          </DialogDescription>
        </DialogHeader>

        {editableFields.length === 0 ? (
          <section className="py-4">
            <p className="text-sm text-muted-foreground">
              Nenhum campo desta tabela pode ser editado em massa.
            </p>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button variant="outline">Fechar</Button>
              </DialogClose>
            </DialogFooter>
          </section>
        ) : (
          <section className="space-y-4 py-2">
            <div className="space-y-1">
              <span className="text-sm font-medium">Campo</span>
              <Select
                value={fieldId ?? ''}
                onValueChange={(value) => setFieldId(value)}
              >
                <SelectTrigger
                  data-test-id="bulk-edit-field-select"
                  className="w-full"
                >
                  <SelectValue placeholder="Selecione o campo" />
                </SelectTrigger>
                <SelectContent>
                  {editableFields.map((field) => (
                    <SelectItem
                      key={field._id}
                      value={field._id}
                    >
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedField ? (
              <BulkEditValueForm
                key={selectedField._id}
                slug={slug}
                field={selectedField}
                ids={selectedIds}
                onDone={() => {
                  onOpenChange(false);
                  onSuccess();
                }}
              />
            ) : (
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
              </DialogFooter>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface BulkEditValueFormProps {
  slug: string;
  field: IField;
  ids: Array<string>;
  onDone: () => void;
}

function BulkEditValueForm({
  slug,
  field,
  ids,
  onDone,
}: BulkEditValueFormProps): React.JSX.Element {
  const form = useAppForm({
    defaultValues: buildCreateRowDefaultValues([field]),
    onSubmit: async ({ value }) => {
      if (bulkUpdate.status === 'pending') return;
      const data = buildRowPayload(value, [field]);
      await bulkUpdate.mutateAsync({ slug, ids, data });
    },
  });

  const bulkUpdate = useBulkUpdateTableRows({
    onSuccess(result) {
      const failed = result.errors ? Object.keys(result.errors).length : 0;

      toastSuccess(
        result.modified === 1
          ? '1 registro atualizado!'
          : `${result.modified} registros atualizados!`,
        'O campo selecionado foi aplicado aos registros.',
      );

      if (failed > 0) {
        toastWarning(
          failed === 1
            ? '1 registro não pôde ser atualizado'
            : `${failed} registros não puderam ser atualizados`,
        );
      }

      onDone();
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao atualizar os registros' });
    },
  });

  const isPending = bulkUpdate.status === 'pending';

  return (
    <form
      data-test-id="bulk-edit-value-form"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.AppField
        name={field.slug}
        validators={{
          onChange: ({ value }: { value: any }) =>
            buildFieldValidator(field, value),
        }}
      >
        {(formField: any) => {
          switch (field.type) {
            case E_FIELD_TYPE.TEXT_SHORT:
              return (
                <formField.TableRowTextField
                  field={field}
                  disabled={isPending}
                />
              );
            case E_FIELD_TYPE.DATE:
              return (
                <formField.TableRowDateField
                  field={field}
                  disabled={isPending}
                />
              );
            case E_FIELD_TYPE.DROPDOWN:
              return (
                <formField.TableRowDropdownField
                  field={field}
                  disabled={isPending}
                  tableSlug={slug}
                />
              );
            case E_FIELD_TYPE.CATEGORY:
              return (
                <formField.TableRowCategoryField
                  field={field}
                  disabled={isPending}
                />
              );
            case E_FIELD_TYPE.USER:
              return (
                <formField.TableRowUserField
                  field={field}
                  disabled={isPending}
                />
              );
            default:
              return null;
          }
        }}
      </form.AppField>

      <DialogFooter className="inline-flex w-full gap-2 justify-end">
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
          >
            Cancelar
          </Button>
        </DialogClose>
        <Button
          type="button"
          data-test-id="bulk-edit-submit-btn"
          disabled={isPending}
          onClick={() => form.handleSubmit()}
        >
          {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
          <span>Aplicar</span>
        </Button>
      </DialogFooter>
    </form>
  );
}
