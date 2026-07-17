import React from 'react';

import { Button } from '@/components/ui/button';
import type { IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

export function KanbanRowExtraFieldsSection({
  extraFields,
  editingFieldSlug,
  isExtraFieldEditable,
  onStartEdit,
  onCancelEdit,
  onSubmit,
  renderExtraField,
  renderExtraFieldEditor,
  isSaving,
}: {
  extraFields: Array<IField>;
  editingFieldSlug: string | null;
  isExtraFieldEditable: (field: IField) => boolean;
  onStartEdit: (slug: string) => void;
  onCancelEdit: () => void;
  onSubmit: () => void;
  renderExtraField: (field: IField) => React.JSX.Element;
  renderExtraFieldEditor: (field: IField) => React.JSX.Element;
  isSaving: boolean;
}): React.JSX.Element | null {
  if (extraFields.length === 0) return null;

  return (
    <section
      data-slot="kanban-row-extra-fields"
      data-test-id="kanban-row-extra-fields"
      className="mt-6 space-y-4"
    >
      <h3 className="text-sm font-semibold">Campos adicionais</h3>
      {extraFields.map((field) => (
        <div
          key={field._id}
          className="space-y-1"
        >
          {!(
            editingFieldSlug === field.slug && isExtraFieldEditable(field)
          ) && (
            <div className="text-xs text-muted-foreground">
              {resolveFieldLabel(field, 'detail')}
            </div>
          )}
          {((): React.ReactNode => {
            if (
              editingFieldSlug === field.slug &&
              isExtraFieldEditable(field)
            ) {
              return (
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    {renderExtraFieldEditor(field)}
                  </div>
                  <div className="flex gap-2 shrink-0 pb-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      className="cursor-pointer"
                      onClick={onCancelEdit}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="cursor-pointer"
                      disabled={isSaving}
                    >
                      Salvar
                    </Button>
                  </div>
                </form>
              );
            }
            return (
              <div
                role="button"
                tabIndex={0}
                className="w-full text-left rounded-md border border-transparent px-2 py-1 -ml-2 hover:border-muted-foreground/30 hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  if (!isExtraFieldEditable(field)) return;
                  onStartEdit(field.slug);
                }}
                onKeyDown={(event) => {
                  if (!isExtraFieldEditable(field)) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onStartEdit(field.slug);
                  }
                }}
              >
                {renderExtraField(field)}
              </div>
            );
          })()}
        </div>
      ))}
    </section>
  );
}
