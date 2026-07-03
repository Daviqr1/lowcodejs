import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import React from 'react';

import { GroupRowsDataTable } from '@/components/common/dynamic-table/group-rows';
import { AttachmentContextMenu } from '@/components/common/file-upload/attachment-context-menu';
import { FileUploadWithStorage } from '@/components/common/file-upload/file-upload-with-storage';
import { Button } from '@/components/ui/button';
import { E_FIELD_TYPE } from '@/lib/constant';
import type {
  IField,
  IGroupConfiguration,
  IRow,
  IStorage,
  ITable,
  IUser,
} from '@/lib/interfaces';
import { normalizeIdList } from '@/lib/kanban-helpers';
import { getStorageDownloadUrl } from '@/lib/storage-url';
import { resolveFieldLabel } from '@/lib/table';

interface KanbanFieldGroupEditorProps {
  row: IRow;
  field: IField;
  table: ITable;
  tableSlug: string;
  currentUserId?: string;
  updateRow: {
    mutateAsync: (params: {
      slug: string;
      rowId: string;
      data: Record<string, any>;
    }) => Promise<any>;
    status: string;
  };
}

function normalizeGroupRow(
  groupRow: Record<string, any>,
  groupFields: Array<IField>,
): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const gf of groupFields) {
    const value = groupRow[gf.slug];
    switch (gf.type) {
      case E_FIELD_TYPE.FILE:
      case E_FIELD_TYPE.USER:
      case E_FIELD_TYPE.RELATIONSHIP:
        normalized[gf.slug] = normalizeIdList(value);
        break;
      case E_FIELD_TYPE.DROPDOWN:
      case E_FIELD_TYPE.CATEGORY:
        {
          let dropdownValue: Array<any> = [];
          if (Array.isArray(value)) {
            dropdownValue = value;
          } else if (value) {
            dropdownValue = [value];
          }
          normalized[gf.slug] = dropdownValue;
        }
        break;
      default:
        normalized[gf.slug] = value ?? null;
    }
  }
  return normalized;
}

function isAttachmentMode(groupFields: Array<IField>): boolean {
  const hasFile = groupFields.some((f) => f.type === E_FIELD_TYPE.FILE);
  const hasAutor = groupFields.some(
    (f) => f.type === E_FIELD_TYPE.USER && f.slug === 'autor',
  );
  const hasData = groupFields.some(
    (f) => f.type === E_FIELD_TYPE.DATE && f.slug === 'data',
  );
  return hasFile && hasAutor && hasData;
}

function getStoragesFromGroupRow(
  groupRow: Record<string, any>,
  fileField: IField,
): Array<IStorage> {
  const raw = groupRow[fileField.slug];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item: any): item is IStorage =>
      item && typeof item === 'object' && item.url,
  );
}

function getAuthorFromGroupRow(groupRow: Record<string, any>): IUser | null {
  const raw = groupRow['autor'];
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === 'object' && first.name) {
      return first;
    }
    return null;
  }
  if (raw && typeof raw === 'object' && raw.name) {
    return raw;
  }
  return null;
}

function formatAttachmentDate(dateValue: any): string | null {
  if (!dateValue) return null;
  try {
    return format(new Date(dateValue), "HH:mm 'de' dd/MM/yyyy", {
      locale: ptBR,
    });
  } catch {
    return null;
  }
}

function renderAttachmentThumbnail(storage: IStorage): React.JSX.Element {
  let preview = (
    <div className="size-9 rounded border bg-muted flex items-center justify-center">
      <FileIcon className="size-4 text-muted-foreground" />
    </div>
  );
  if (storage.mimetype?.includes('image')) {
    preview = (
      <img
        src={storage.url}
        alt={storage.originalName}
        className="size-9 rounded object-cover border"
      />
    );
  } else if (storage.mimetype === 'application/pdf') {
    preview = (
      <div className="size-9 rounded border bg-muted flex items-center justify-center">
        <FileTextIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <AttachmentContextMenu storage={storage}>
      <a
        href={storage.url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0"
      >
        {preview}
      </a>
    </AttachmentContextMenu>
  );
}

export function KanbanFieldGroupEditor({
  row,
  field,
  table,
  tableSlug,
  currentUserId,
  updateRow,
}: KanbanFieldGroupEditorProps): React.JSX.Element {
  const [isAdding, setIsAdding] = React.useState(false);
  const [newItem, setNewItem] = React.useState<Record<string, any>>({});
  const [uploadFiles, setUploadFiles] = React.useState<Array<File>>([]);
  const [uploadStorages, setUploadStorages] = React.useState<Array<IStorage>>(
    [],
  );
  const [isUploading, setIsUploading] = React.useState(false);

  const groupSlug = field.group?.slug;
  const group: IGroupConfiguration | undefined = table.groups.find(
    (g) => g.slug === groupSlug,
  );

  const groupFields =
    group?.fields.filter(
      (f) => f.type !== E_FIELD_TYPE.FIELD_GROUP && !f.trashed && !f.native,
    ) ?? [];

  // Dados dinâmicos do grupo (row[slug] é any via index signature do IRow).
  let groupData: Array<Record<string, any>> = [];
  if (Array.isArray(row[field.slug])) groupData = row[field.slug];

  const isSaving = updateRow.status === 'pending';
  const attachmentMode = isAttachmentMode(groupFields);

  const handleDelete = async (index: number): Promise<void> => {
    const remaining = groupData.filter((_, i) => i !== index);
    const normalized = remaining.map((item) =>
      normalizeGroupRow(item, groupFields),
    );
    await updateRow.mutateAsync({
      slug: tableSlug,
      rowId: row._id,
      data: { [field.slug]: normalized },
    });
  };

  const handleAddCancel = (): void => {
    setIsAdding(false);
    setNewItem({});
    setUploadFiles([]);
    setUploadStorages([]);
    setIsUploading(false);
  };

  const handleAddSave = async (): Promise<void> => {
    if (isSaving) return;

    const itemPayload: Record<string, any> = {};

    if (attachmentMode) {
      for (const gf of groupFields) {
        if (gf.type === E_FIELD_TYPE.FILE) {
          itemPayload[gf.slug] = uploadStorages.map((s) => s._id);
        } else if (gf.type === E_FIELD_TYPE.USER && gf.slug === 'autor') {
          if (currentUserId) {
            itemPayload[gf.slug] = normalizeIdList(currentUserId);
          } else {
            itemPayload[gf.slug] = [];
          }
        } else if (gf.type === E_FIELD_TYPE.DATE && gf.slug === 'data') {
          itemPayload[gf.slug] = new Date().toISOString();
        } else {
          itemPayload[gf.slug] = newItem[gf.slug] ?? null;
        }
      }
    } else {
      for (const gf of groupFields) {
        if (gf.type === E_FIELD_TYPE.FILE) {
          itemPayload[gf.slug] = uploadStorages.map((s) => s._id);
        } else {
          itemPayload[gf.slug] = newItem[gf.slug] ?? null;
        }
      }
    }

    const normalizedExisting = groupData.map((item) =>
      normalizeGroupRow(item, groupFields),
    );

    await updateRow.mutateAsync({
      slug: tableSlug,
      rowId: row._id,
      data: { [field.slug]: [...normalizedExisting, itemPayload] },
    });
    handleAddCancel();
  };

  if (!groupSlug || !group) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const fileFields = groupFields.filter((gf) => gf.type === E_FIELD_TYPE.FILE);

  if (attachmentMode) {
    const fileField = fileFields[0];

    return (
      <div
        data-slot="kanban-field-group-editor"
        data-test-id="kanban-field-group-editor"
        className="space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {resolveFieldLabel(field, 'detail')}
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => setIsAdding(true)}
            disabled={isSaving || isAdding}
          >
            <PlusIcon className="size-3.5 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2 rounded-md border px-3 py-2">
          {((): React.ReactNode => {
            if (groupData.length > 0) {
              return (
                <ul className="space-y-2">
                  {groupData.map((groupRow, index) => {
                    let storages: ReturnType<typeof getStoragesFromGroupRow> =
                      [];
                    if (fileField) {
                      storages = getStoragesFromGroupRow(groupRow, fileField);
                    }
                    const author = getAuthorFromGroupRow(groupRow);
                    const dateStr = formatAttachmentDate(groupRow['data']);

                    if (storages.length === 0) {
                      return (
                        <li
                          key={groupRow._id || index}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-sm text-muted-foreground">
                            Arquivo removido
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer text-destructive shrink-0"
                            disabled={isSaving}
                            onClick={() => handleDelete(index)}
                          >
                            <TrashIcon className="size-3.5" />
                          </Button>
                        </li>
                      );
                    }

                    return storages.map((storage) => (
                      <li
                        key={storage._id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex min-w-0 items-center gap-2 flex-1">
                          {renderAttachmentThumbnail(storage)}
                          <div className="min-w-0 flex-1">
                            <AttachmentContextMenu storage={storage}>
                              <a
                                href={storage.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-primary underline underline-offset-2 truncate block"
                              >
                                {storage.originalName}
                              </a>
                            </AttachmentContextMenu>
                            {(author || dateStr) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {((): string => {
                                  if (author) {
                                    return `Adicionado por: ${author.name}`;
                                  }
                                  return 'Adicionado';
                                })()}
                                {((): string => {
                                  if (dateStr) {
                                    return ` às ${dateStr}`;
                                  }
                                  return '';
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={getStorageDownloadUrl(storage)}
                            aria-label={`Baixar ${storage.originalName}`}
                            title="Baixar"
                            className="text-muted-foreground hover:text-primary p-1"
                          >
                            <DownloadIcon className="size-3.5" />
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer text-destructive"
                            disabled={isSaving}
                            onClick={() => handleDelete(index)}
                          >
                            <TrashIcon className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ));
                  })}
                </ul>
              );
            }
            return <span className="text-sm text-muted-foreground">-</span>;
          })()}

          {isAdding && (
            <div className="space-y-2 border-t pt-2">
              <FileUploadWithStorage
                value={uploadFiles}
                onValueChange={setUploadFiles}
                onStorageChange={setUploadStorages}
                maxFiles={10}
                onUploadingChange={setIsUploading}
                compact
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={handleAddCancel}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={handleAddSave}
                  disabled={
                    isSaving || isUploading || uploadStorages.length === 0
                  }
                >
                  Adicionar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Modo genérico delega para a tabela de itens de grupo (endpoints group-rows),
  // que renderiza os seletores corretos (relacionamento, dropdown, etc.).
  return (
    <GroupRowsDataTable
      tableSlug={tableSlug}
      rowId={row._id}
      field={field}
      table={table}
    />
  );
}
