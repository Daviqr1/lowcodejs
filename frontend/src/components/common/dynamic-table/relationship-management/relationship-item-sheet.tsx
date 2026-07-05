import type { AxiosError } from 'axios';
import React from 'react';
import { toast } from 'sonner';

import {
  getRelatedFormFields,
  renderRelationshipCardField,
} from './relationship-rows-inline';

import {
  UploadingProvider,
  useIsUploading,
} from '@/components/common/file-upload/uploading-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useRelationshipLinkCreate } from '@/hooks/tanstack-query/use-relationship-link-create';
import { useCreateTableRow } from '@/hooks/tanstack-query/use-table-row-create';
import { useUpdateTableRow } from '@/hooks/tanstack-query/use-table-row-update';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { handleApiError } from '@/lib/handle-api-error';
import type { IField, IRow, ITable } from '@/lib/interfaces';
import type { CreateRowDefaultValue } from '@/lib/table';
import {
  buildCreateRowDefaultValues,
  buildFieldValidator,
  buildRowPayload,
  buildUpdateRowDefaultValues,
} from '@/lib/table';

type RelationshipItemSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: IField;
  relatedTable: ITable;
  parentTableSlug: string;
  relationshipId: string;
  side: 'source' | 'target';
  recordId: string;
  editRow: IRow | null;
  onChanged: () => void;
};

export function RelationshipItemSheet(
  props: RelationshipItemSheetProps,
): React.JSX.Element {
  return (
    <Sheet
      data-slot="relationship-item-sheet"
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full gap-0 p-0"
      >
        <UploadingProvider>
          <RelationshipItemSheetContent {...props} />
        </UploadingProvider>
      </SheetContent>
    </Sheet>
  );
}

function RelationshipItemSheetContent({
  onOpenChange,
  relatedTable,
  parentTableSlug,
  relationshipId,
  side,
  recordId,
  editRow,
  onChanged,
}: RelationshipItemSheetProps): React.JSX.Element {
  const isEdit = Boolean(editRow);
  const isUploading = useIsUploading();
  const otherTableSlug = relatedTable.slug;

  const fields = React.useMemo(
    (): Array<IField> => getRelatedFormFields(relatedTable),
    [relatedTable],
  );

  const defaultValues = React.useMemo((): CreateRowDefaultValue => {
    if (editRow) return buildUpdateRowDefaultValues(editRow, fields);
    return buildCreateRowDefaultValues(fields);
  }, [editRow, fields]);

  const createLink = useRelationshipLinkCreate({
    tableSlug: parentTableSlug,
    relationshipId,
    side,
    recordId,
    onSuccess(): void {
      onChanged();
    },
    onError(): void {
      toast.error('Não foi possível vincular o registro');
    },
  });

  const createRow = useCreateTableRow({
    onError(error: AxiosError | Error): void {
      handleApiError(error, {
        context: 'Erro ao criar o registro relacionado',
      });
    },
  });

  const updateRow = useUpdateTableRow({
    onError(error: AxiosError | Error): void {
      handleApiError(error, {
        context: 'Erro ao salvar o registro relacionado',
      });
    },
  });

  const isPending =
    createRow.status === 'pending' ||
    updateRow.status === 'pending' ||
    createLink.status === 'pending';

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }): Promise<void> => {
      if (isPending) return;
      const payload = buildRowPayload(value, fields);
      if (editRow) {
        await updateRow.mutateAsync({
          slug: otherTableSlug,
          rowId: editRow._id,
          data: payload,
        });
        onChanged();
        onOpenChange(false);
        return;
      }
      const created = await createRow.mutateAsync({
        slug: otherTableSlug,
        data: payload,
      });
      await createLink.mutateAsync({ otherId: String(created._id) });
      onOpenChange(false);
    },
  });

  return (
    <React.Fragment>
      <SheetHeader>
        <SheetTitle>
          {isEdit && 'Editar item'}
          {!isEdit && 'Adicionar item'}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {isEdit && 'Formulário para editar o registro relacionado'}
          {!isEdit && 'Formulário para adicionar um novo registro relacionado'}
        </SheetDescription>
      </SheetHeader>

      <form
        className="flex-1 min-h-0 overflow-auto px-4 flex flex-wrap gap-4 content-start"
        onSubmit={(e: React.FormEvent<HTMLFormElement>): void => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        {fields.map((relatedField) => (
          <div
            key={relatedField._id}
            className="min-w-[200px]"
            style={{ width: `calc(${relatedField.widthInForm ?? 50}% - 1rem)` }}
          >
            <form.AppField
              name={relatedField.slug}
              validators={{
                // value dinâmico do campo (render prop do TanStack Form).
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange: ({ value }: { value: any }): string | undefined =>
                  buildFieldValidator(relatedField, value),
              }}
            >
              {/* formField expõe componentes de campo do app — sem tipo exportado. */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(formField: any): React.JSX.Element | null =>
                renderRelationshipCardField(
                  formField,
                  relatedField,
                  otherTableSlug,
                )
              }
            </form.AppField>
          </div>
        ))}
      </form>

      <SheetFooter>
        <Button
          type="button"
          variant="outline"
          onClick={(): void => onOpenChange(false)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={isPending || isUploading}
          onClick={(): void => {
            void form.handleSubmit();
          }}
        >
          {isPending && <Spinner />}
          <span>
            {isEdit && 'Salvar'}
            {!isEdit && 'Criar'}
          </span>
        </Button>
      </SheetFooter>
    </React.Fragment>
  );
}
