import React from 'react';
import { toast } from 'sonner';

import {
  buildGroupRowPayload,
  getFieldDefault,
  renderGroupFormField,
  transformFieldValueForEdit,
} from './group-row-form-helpers';

import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useCreateGroupRow } from '@/hooks/tanstack-query/use-group-row-create';
import { useUpdateGroupRow } from '@/hooks/tanstack-query/use-group-row-update';
import { useDismissableDialog } from '@/hooks/use-dismissable-dialog';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { handleApiError } from '@/lib/handle-api-error';
import type { IField, IRow, Merge } from '@/lib/interfaces';
import { isFieldShownInContext } from '@/lib/permission';
import type { FieldValue } from '@/lib/table';
import { buildFieldValidator } from '@/lib/table';

type GroupRowFormDialogProps = Merge<
  React.ComponentProps<typeof SheetTrigger>,
  {
    tableSlug: string;
    rowId: string;
    groupSlug: string;
    groupFields: Array<IField>;
    editItem?: IRow | null;
  }
>;

type GroupRowFormContentProps = {
  tableSlug: string;
  rowId: string;
  groupSlug: string;
  groupFields: Array<IField>;
  editItem?: IRow | null;
  close: () => void;
};

export function GroupRowFormDialog({
  ref,
  tableSlug,
  rowId,
  groupSlug,
  groupFields,
  editItem,
  ...rest
}: GroupRowFormDialogProps): React.JSX.Element {
  const { closeRef, close } = useDismissableDialog();

  return (
    <Sheet>
      <SheetTrigger
        {...rest}
        ref={ref}
      />
      <SheetContent
        data-slot="group-row-form-dialog"
        data-test-id="group-row-form-dialog"
        side="right"
        className="sm:max-w-2xl w-full overflow-y-auto px-4"
      >
        <SheetClose
          ref={closeRef}
          className="hidden"
        />
        <UploadingProvider>
          <GroupRowFormDialogContent
            tableSlug={tableSlug}
            rowId={rowId}
            groupSlug={groupSlug}
            groupFields={groupFields}
            editItem={editItem}
            close={close}
          />
        </UploadingProvider>
      </SheetContent>
    </Sheet>
  );
}

function GroupRowFormDialogContent({
  close,
  tableSlug,
  rowId,
  groupSlug,
  groupFields,
  editItem,
}: GroupRowFormContentProps): React.JSX.Element {
  const isEdit = Boolean(editItem);
  const isUploading = useIsUploading();

  const visibleFields = React.useMemo(
    () => groupFields.filter((f) => isFieldShownInContext(f, 'form')),
    [groupFields],
  );

  const defaultValues = React.useMemo(() => {
    // valores por slug de campo dinâmico (shape só conhecido em runtime).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaults: Record<string, any> = {};
    for (const field of visibleFields) {
      if (isEdit && editItem) {
        defaults[field.slug] = transformFieldValueForEdit(
          editItem[field.slug],
          field,
        );
      } else {
        defaults[field.slug] = getFieldDefault(field);
      }
    }
    return defaults;
  }, [visibleFields, editItem, isEdit]);

  const _create = useCreateGroupRow({
    onSuccess() {
      toast.success('Item criado', {
        description: 'O item foi criado com sucesso',
      });
      close();
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao criar item' });
    },
  });

  const _update = useUpdateGroupRow({
    onSuccess() {
      toast.success('Item atualizado', {
        description: 'O item foi atualizado com sucesso',
      });
      close();
    },
    onError(error) {
      handleApiError(error, { context: 'Erro ao atualizar item' });
    },
  });

  const isPending =
    _create.status === 'pending' || _update.status === 'pending';

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (isPending) return;
      const payload = buildGroupRowPayload(value, visibleFields);

      if (isEdit && editItem) {
        await _update.mutateAsync({
          tableSlug,
          rowId,
          groupSlug,
          itemId: editItem._id,
          data: payload,
        });
      } else {
        await _create.mutateAsync({
          tableSlug,
          rowId,
          groupSlug,
          data: payload,
        });
      }
    },
  });

  return (
    <React.Fragment>
      <SheetHeader className="px-0">
        <SheetTitle>
          {isEdit && 'Editar item'}
          {!isEdit && 'Adicionar item'}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Preencha os campos do item do grupo
        </SheetDescription>
      </SheetHeader>

      <form
        className="flex flex-wrap gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        {visibleFields.map((field) => (
          <div
            key={field._id}
            className="min-w-[200px]"
            style={{ width: `calc(${field.widthInForm ?? 50}% - 1rem)` }}
          >
            <form.AppField
              name={field.slug}
              validators={{
                onChange: ({ value }: { value: FieldValue | undefined }) =>
                  buildFieldValidator(field, value),
              }}
            >
              {(formField) =>
                renderGroupFormField(formField, field, tableSlug, groupSlug)
              }
            </form.AppField>
          </div>
        ))}
      </form>

      <SheetFooter>
        <SheetClose asChild>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
          >
            Cancelar
          </Button>
        </SheetClose>
        <form.Subscribe
          selector={(state) => [state.canSubmit]}
          children={([canSubmit]) => (
            <Button
              type="button"
              data-test-id="group-row-submit-btn"
              disabled={!canSubmit || isPending || isUploading}
              onClick={() => form.handleSubmit()}
            >
              {isPending && <Spinner />}
              <span>
                {isEdit && 'Salvar'}
                {!isEdit && 'Criar'}
              </span>
            </Button>
          )}
        />
      </SheetFooter>
    </React.Fragment>
  );
}
