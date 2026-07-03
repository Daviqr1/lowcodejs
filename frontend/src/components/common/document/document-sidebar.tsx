import type {
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from '@tanstack/react-router';
import {
  BookOpenCheckIcon,
  GripVerticalIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SettingsIcon,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DocumentSidebarAddDialog } from './document-sidebar-add-dialog';
import type { DropMode } from './document-sidebar-helpers';
import {
  buildParentMap,
  findNodeAndRemove,
  findNodeByIdLocal,
  getAncestors,
  getDropMode,
  insertNodeAt,
  isDescendant,
  reorderInTree,
  updateNodeLabel,
} from './document-sidebar-helpers';
import { DocumentSidebarTree } from './document-sidebar-tree';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { useTablePermission } from '@/hooks/use-table-permission';
import { useAppForm } from '@/integrations/tanstack-form/form-hook';
import { API } from '@/lib/api';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { CatNode } from '@/lib/document-helpers';
import { buildLabelMap } from '@/lib/document-helpers';
import { handleApiError } from '@/lib/handle-api-error';
import type { IField } from '@/lib/interfaces';
import { isFieldShownInContext } from '@/lib/permission';
import { cn } from '@/lib/utils';

export function DocumentSidebar({
  title = 'Índice',
  nodes,
  selectedId,
  onSelect,
  isOpen,
  onToggle,
  categoryField,
}: {
  title?: string;
  nodes: Array<CatNode>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  categoryField: IField;
}): React.JSX.Element {
  const [treeNodes, setTreeNodes] = useState<Array<CatNode>>(nodes);
  const parentMap = useMemo(
    () => buildParentMap(treeNodes, null, new Map()),
    [treeNodes],
  );
  const labelMap = useMemo(() => buildLabelMap(treeNodes), [treeNodes]);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [dragEnabledId, setDragEnabledId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverMode, setDragOverMode] = useState<DropMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const rootDropId = 'document-sidebar-root';
  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: rootDropId,
    data: { parentId: null },
  });

  useEffect(() => {
    setTreeNodes(nodes);
  }, [nodes]);

  useEffect((): void | (() => void) => {
    if (!dragEnabledId) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setDragEnabledId(null);
        cancelEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dragEnabledId]);

  const toggleOpen = (id: string): void => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (!selectedId) return;
    const ancestors = getAncestors(selectedId, parentMap);
    if (!ancestors.length) return;

    setOpenMap((prev) => {
      const next = { ...prev };
      for (const a of ancestors) next[a] = true;
      next[selectedId] = true;
      return next;
    });
  }, [selectedId, parentMap]);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { slug } = useParams({
    from: '/_private/tables/$slug/',
  });
  const table = useReadTable({ slug });
  const permission = useTablePermission(table.data);

  const canManageCategory =
    permission.can('UPDATE_FIELD') &&
    categoryField._id &&
    categoryField.type === E_FIELD_TYPE.CATEGORY;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addCategory = useMutation({
    mutationFn: async (payload: { label: string; parentId: string | null }) => {
      const route = `/tables/${slug}/fields/${categoryField._id}/category`;
      const response = await API.post<{
        node: { id: string; label: string; parentId: string | null };
        field: IField;
      }>(route, payload);
      return response.data;
    },
    onSuccess(_data) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(slug),
      });

      toast.success('Seção criada', {
        description: 'A seção foi criada com sucesso',
      });

      setAddModalOpen(false);
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao criar seção',
      });
    },
  });

  const addCategoryForm = useAppForm({
    defaultValues: {
      label: '',
    },
    onSubmit: async ({ value }) => {
      if (!canManageCategory) return;
      const label = value.label.trim();
      if (!label || addCategory.status === 'pending') return;

      await addCategory.mutateAsync({
        label,
        parentId: addParentId,
      });
    },
  });

  useEffect(() => {
    if (addModalOpen) return;
    addCategoryForm.reset({ label: '' });
  }, [addCategoryForm, addModalOpen]);

  const handleOpenAdd = (parentId: string | null): void => {
    if (!canManageCategory) return;
    setAddParentId(parentId);
    addCategoryForm.reset({ label: '' });
    setAddModalOpen(true);
  };

  const updateCategoryTree = useMutation({
    mutationFn: async (category: Array<CatNode>) => {
      const route = `/tables/${slug}/fields/${categoryField._id}`;
      const response = await API.put<IField>(route, {
        name: categoryField.name,
        type: categoryField.type,
        required: categoryField.required,
        multiple: categoryField.multiple,
        showInFilter: categoryField.showInFilter,
        showInForm: isFieldShownInContext(categoryField, 'form'),
        showInDetail: isFieldShownInContext(categoryField, 'detail'),
        showInList: isFieldShownInContext(categoryField, 'list'),
        format: categoryField.format,
        defaultValue: categoryField.defaultValue,
        dropdown: categoryField.dropdown,
        relationship: categoryField.relationship,
        group: null,
        category,
        trashed: categoryField.trashed,
        trashedAt: categoryField.trashedAt,
      });
      return response.data;
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(slug),
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao atualizar categorias',
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const route = `/tables/${slug}/fields/${categoryField._id}/category/${categoryId}`;
      const response = await API.delete<{
        field: IField;
        removedIds: Array<string>;
      }>(route);
      return response.data;
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(slug),
      });
      toast.success('Seção excluída', {
        description: 'A seção foi excluída com sucesso',
      });
    },
    onError(error) {
      handleApiError(error, {
        context: 'Erro ao excluir seção',
      });
    },
  });

  const handleRequestDelete = (id: string, label: string): void => {
    if (!canManageCategory) return;
    setDeleteTarget({ id, label });
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;

    if (selectedId === targetId) onSelect(null);

    const previous = treeNodes;
    const { updated, removed } = findNodeAndRemove(treeNodes, targetId);
    if (removed) setTreeNodes(updated);
    setDeleteTarget(null);

    try {
      await deleteCategory.mutateAsync(targetId);
    } catch {
      setTreeNodes(previous);
    }
  };

  const handleCreateArticle = (nodeId: string): void => {
    setDragEnabledId(null);
    cancelEdit();
    router.navigate({
      to: '/tables/$slug/row',
      params: { slug },
      search: { category: nodeId },
    });
  };

  const startEdit = (nodeId: string, label: string): void => {
    if (!canManageCategory) return;
    setEditingNodeId(nodeId);
    setEditingLabel(label);
  };

  const cancelEdit = (): void => {
    setEditingNodeId(null);
    setEditingLabel('');
  };

  const saveEdit = async (): Promise<void> => {
    if (!editingNodeId) return;
    const label = editingLabel.trim();
    if (!label) {
      cancelEdit();
      return;
    }

    const currentNode = findNodeByIdLocal(treeNodes, editingNodeId);
    if (currentNode?.label === label) {
      cancelEdit();
      return;
    }

    const previous = treeNodes;
    const updated = updateNodeLabel(treeNodes, editingNodeId, label);
    setTreeNodes(updated);
    setEditingNodeId(null);
    setEditingLabel('');

    try {
      await updateCategoryTree.mutateAsync(updated);
    } catch {
      setTreeNodes(previous);
    }
  };

  const handleDragStart = (event: DragStartEvent): void => {
    if (!canManageCategory) return;
    setDragEnabledId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent): void => {
    if (!canManageCategory) return;
    const { active, over } = event;
    if (!over) {
      setDragOverId(null);
      setDragOverMode(null);
      return;
    }

    if (over.id === rootDropId) {
      setDragOverId(null);
      setDragOverMode(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    if (
      isDescendant(treeNodes, activeId, overId) ||
      (over.data.current?.parentId &&
        isDescendant(treeNodes, activeId, String(over.data.current.parentId)))
    ) {
      setDragOverId(null);
      setDragOverMode(null);
      return;
    }

    const mode = getDropMode(event);
    setDragOverId(overId);
    setDragOverMode(mode);
  };

  const handleDragCancel = (_event: DragCancelEvent): void => {
    setDragEnabledId(null);
    setDragOverId(null);
    setDragOverMode(null);
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    if (!canManageCategory) return;
    const { active, over } = event;
    setDragEnabledId(null);
    setDragOverId(null);
    setDragOverMode(null);
    if (!over || active.id === over.id) return;

    const activeParentId: string | null = active.data.current?.parentId ?? null;
    const overParentId: string | null = over.data.current?.parentId ?? null;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (over.id === rootDropId) {
      if (activeParentId === null) return;
      const { updated, removed } = findNodeAndRemove(treeNodes, activeId);
      if (!removed) return;
      const next = insertNodeAt(updated, null, updated.length, removed);
      const previous = treeNodes;
      setTreeNodes(next);
      try {
        await updateCategoryTree.mutateAsync(next);
      } catch {
        setTreeNodes(previous);
      }
      return;
    }

    if (
      (overParentId && isDescendant(treeNodes, activeId, overParentId)) ||
      isDescendant(treeNodes, activeId, overId)
    ) {
      return;
    }

    const computedMode = getDropMode(event);
    const shouldNest = computedMode === 'nest';

    let next = treeNodes;

    if (activeParentId === overParentId) {
      if (shouldNest) {
        if (activeId !== overId) {
          const { updated, removed } = findNodeAndRemove(treeNodes, activeId);
          if (!removed) return;
          const targetNode = findNodeByIdLocal(updated, overId);
          const childIndex = targetNode?.children?.length ?? 0;
          next = insertNodeAt(updated, overId, childIndex, removed);
        }
      } else {
        next = reorderInTree(treeNodes, activeParentId, activeId, overId);
      }
    } else {
      const { updated, removed } = findNodeAndRemove(treeNodes, activeId);
      if (!removed) return;

      if (shouldNest) {
        const targetNode = findNodeByIdLocal(updated, overId);
        const childIndex = targetNode?.children?.length ?? 0;
        next = insertNodeAt(updated, overId, childIndex, removed);
      } else {
        let targetList = updated;
        if (overParentId !== null) {
          targetList = findNodeByIdLocal(updated, overParentId)?.children ?? [];
        }
        const insertIndex = targetList.findIndex((item) => item.id === overId);
        let nextIndex = targetList.length;
        if (insertIndex !== -1) {
          nextIndex = insertIndex;
        }

        next = insertNodeAt(updated, overParentId, nextIndex, removed);
      }
    }

    if (next === treeNodes) return;
    const previous = treeNodes;
    setTreeNodes(next);
    try {
      await updateCategoryTree.mutateAsync(next);
    } catch {
      setTreeNodes(previous);
    }
  };

  let parentLabel: string | null = null;
  if (addParentId && labelMap.get(addParentId)) {
    parentLabel = labelMap.get(addParentId) ?? null;
  }

  return (
    <div
      data-slot="document-sidebar"
      data-test-id="document-sidebar"
      className="relative h-full w-full"
    >
      <aside className="bg-background border-r h-full flex flex-col w-full overflow-hidden">
        <button
          onClick={onToggle}
          className="p-2 rounded cursor-pointer absolute top-2 right-1"
        >
          {isOpen && <PanelLeftCloseIcon className="size-5" />}
          {!isOpen && <PanelLeftOpenIcon className="size-5" />}
        </button>
        {isOpen && (
          <div className="p-3 border-b flex items-center justify-between">
            <div className="text-sm font-medium">{title}</div>
          </div>
        )}

        {isOpen && (
          <div className="p-2 space-y-2 overflow-auto flex-1 min-h-0 relative">
            {dragEnabledId && (
              <div className="rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground flex items-center gap-2">
                <GripVerticalIcon className="size-3.5" />
                <span>
                  Modo organização ativo — arraste pelo ícone e pressione Esc
                  para sair
                </span>
              </div>
            )}
            <div
              className={[
                'w-full rounded-md px-2 py-1.5 text-sm transition',
                'flex items-center gap-2',
                selectedId === null && 'bg-muted font-medium',
                selectedId !== null && 'hover:bg-muted/60',
              ].join(' ')}
            >
              <div className="flex-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDragEnabledId(null);
                    cancelEdit();
                    onSelect(null);
                  }}
                  className="flex items-center gap-2 truncate cursor-pointer"
                >
                  <BookOpenCheckIcon className="size-4 opacity-70" />
                  <span>Todas</span>
                </button>
                {permission.can('UPDATE_FIELD') && (
                  <button
                    type="button"
                    className="p-0.5 rounded hover:bg-background/60 cursor-pointer"
                    aria-label="Editar categoria"
                    onClick={() => {
                      router.navigate({
                        to: '/tables/$slug/field/$fieldId',
                        params: { slug, fieldId: categoryField._id },
                      });
                    }}
                  >
                    <SettingsIcon className="size-4 opacity-70" />
                  </button>
                )}
              </div>

              {canManageCategory && (
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-background/60 cursor-pointer"
                  aria-label="Adicionar sessão na raiz"
                  onClick={() => handleOpenAdd(null)}
                >
                  <PlusIcon className="size-4 opacity-70" />
                </button>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div
                ref={setRootDropRef}
                className={cn(
                  isOverRoot &&
                    'rounded-md ring-1 ring-primary/40 bg-primary/5',
                )}
              >
                <DocumentSidebarTree
                  nodes={treeNodes}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setDragEnabledId(null);
                    cancelEdit();
                    onSelect(id);
                  }}
                  openMap={openMap}
                  toggleOpen={toggleOpen}
                  onAddChild={handleOpenAdd}
                  onCreateArticle={handleCreateArticle}
                  onDelete={handleRequestDelete}
                  canAdd={!!canManageCategory}
                  editingNodeId={editingNodeId}
                  editingLabel={editingLabel}
                  onEditLabelChange={setEditingLabel}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  dragOverId={dragOverId}
                  dragOverMode={dragOverMode}
                  parentId={null}
                />
              </div>
            </DndContext>
          </div>
        )}
      </aside>

      <DocumentSidebarAddDialog
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) {
            addCategoryForm.reset({ label: '' });
            setAddParentId(null);
          }
        }}
        parentLabel={parentLabel}
        form={addCategoryForm}
        onCancel={() => setAddModalOpen(false)}
        isPending={addCategory.status === 'pending'}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          data-test-id="document-delete-section-dialog"
        >
          <DialogHeader>
            <DialogTitle>Excluir seção</DialogTitle>
            <DialogDescription>
              {deleteTarget &&
                `A seção "${deleteTarget.label}" e suas subseções serão excluídas. Os artigos vinculados não serão apagados, mas perderão a categoria.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteCategory.status === 'pending'}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteCategory.status === 'pending'}
              onClick={() => {
                void handleConfirmDelete();
              }}
            >
              {deleteCategory.status === 'pending' && <Spinner />}
              <span>Excluir</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
