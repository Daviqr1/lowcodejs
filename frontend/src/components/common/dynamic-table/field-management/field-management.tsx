import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  LoaderCircleIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import type {
  FieldManagementActions,
  VisibilityKey,
} from './field-management-context';
import {
  FieldManagementProvider,
  useFieldManagement,
} from './field-management-context';

import { FieldTitle } from '@/components/common/field-title';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField } from '@/lib/interfaces';
import type { FieldContext } from '@/lib/permission';
import { isFieldShownInContext } from '@/lib/permission';
import { resolveFieldLabel } from '@/lib/table';
import { cn } from '@/lib/utils';

// Chave do toggle -> contexto do binding. `showInFilter` não é permissão.
const FIELD_CONTEXT_BY_VISIBILITY_KEY: Partial<
  Record<VisibilityKey, FieldContext>
> = {
  showInList: 'list',
  showInForm: 'form',
  showInDetail: 'detail',
};

// Valor atual de visibilidade do campo para uma chave do toggle: `showInFilter`
// é booleano; list/form/detail derivam do binding (não NOBODY = visível).
function fieldVisibilityValue(
  field: IField,
  visibilityKey: VisibilityKey,
): boolean {
  if (visibilityKey === 'showInFilter') return field.showInFilter;
  const context = FIELD_CONTEXT_BY_VISIBILITY_KEY[visibilityKey];
  if (!context) return false;
  return isFieldShownInContext(field, context);
}

// Campos internos de sistema que nunca devem ser gerenciaveis na UI.
// Filtra por slug (estavel) alem do type, cobrindo dados legados onde o type difere.
const SYSTEM_INTERNAL_FIELD_SLUGS = ['status', 'trashed', 'trashedAt'];

function isManageableField(field: IField, excludeNative?: boolean): boolean {
  if (field.trashed) return false;
  if (excludeNative && field.native) return false;
  if (SYSTEM_INTERNAL_FIELD_SLUGS.includes(field.slug)) return false;
  if (field.type === E_FIELD_TYPE.STATUS) return false;
  if (field.type === E_FIELD_TYPE.TRASHED_AT) return false;
  return true;
}

// --- Internal components ---

interface SortableManagementItemProps {
  field: IField;
  disabled?: boolean;
  dimmed?: boolean;
  visibilityKey: VisibilityKey;
  widthKey?: 'widthInForm' | 'widthInList' | 'widthInDetail';
  onEdit: () => void;
  onToggleVisibility: () => void;
  onWidthChange?: (width: number) => void;
  isTogglingVisibility?: boolean;
  isChangingWidth?: boolean;
}

function SortableManagementItem({
  field,
  disabled,
  dimmed,
  visibilityKey,
  widthKey,
  onEdit,
  onToggleVisibility,
  onWidthChange,
  isTogglingVisibility,
  isChangingWidth,
}: SortableManagementItemProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field._id, disabled });

  let opacityValue = 1;
  if (isDragging) {
    opacityValue = 0.5;
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: opacityValue,
  };

  const isVisible = fieldVisibilityValue(field, visibilityKey);
  let currentWidth: number | null = null;
  if (widthKey) {
    currentWidth = field[widthKey] ?? 50;
  }

  const [localWidth, setLocalWidth] = useState<string>(
    String(currentWidth ?? 0),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalWidth(String(currentWidth ?? 0));
  }, [currentWidth]);

  useEffect(() => {
    return (): void => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      data-slot="sortable-management-item"
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border p-3 shadow-sm min-w-0',
        {
          'bg-card': !dimmed,
          'bg-muted/50': dimmed,
        },
      )}
    >
      <FieldTitle
        value={resolveFieldLabel(field)}
        className="text-sm font-medium"
      />
      <div className="flex items-center gap-1 shrink-0">
        {widthKey && onWidthChange && (
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={localWidth}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              setLocalWidth(raw);
              if (raw === '') return;
              const val = Math.max(0, Number(raw));
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                onWidthChange(val);
              }, 500);
            }}
            disabled={isChangingWidth}
            className="h-8 w-20"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleVisibility}
          disabled={isTogglingVisibility}
          title={(isVisible && 'Ocultar campo') || 'Mostrar campo'}
        >
          {isVisible && <EyeIcon className="h-4 w-4" />}
          {!isVisible && (
            <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface TrashedItemProps {
  field: IField;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  isDeleting?: boolean;
  isRestoring?: boolean;
}

function TrashedItem({
  field,
  onEdit,
  onDelete,
  onRestore,
  isDeleting,
  isRestoring,
}: TrashedItemProps): React.JSX.Element {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 p-3">
      <FieldTitle
        value={resolveFieldLabel(field)}
        className="text-sm text-muted-foreground"
      />
      <div className="flex items-center gap-1">
        <Dialog
          modal
          open={restoreOpen}
          onOpenChange={setRestoreOpen}
        >
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600 hover:text-emerald-600"
              disabled={isRestoring || isDeleting}
              title="Restaurar campo"
            >
              {isRestoring && (
                <LoaderCircleIcon className="h-4 w-4 animate-spin" />
              )}
              {!isRestoring && <ArchiveRestoreIcon className="h-4 w-4" />}
            </Button>
          </DialogTrigger>
          <DialogContent className="py-4 px-6">
            <DialogHeader>
              <DialogTitle>Restaurar campo</DialogTitle>
              <DialogDescription>
                O campo será restaurado e voltará a ser exibido na lista,
                formulário, detalhes e filtros.
              </DialogDescription>
            </DialogHeader>
            <section>
              <form className="pt-4 pb-2">
                <DialogFooter className="inline-flex w-full gap-2 justify-end">
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => {
                      onRestore();
                      setRestoreOpen(false);
                    }}
                  >
                    {isRestoring && (
                      <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                    )}
                    {!isRestoring && <span>Confirmar</span>}
                  </Button>
                </DialogFooter>
              </form>
            </section>
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          disabled={isDeleting || isRestoring}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Dialog
          modal
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        >
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              disabled={isDeleting || isRestoring}
              title="Excluir permanentemente"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="py-4 px-6">
            <DialogHeader>
              <DialogTitle>Excluir campo permanentemente</DialogTitle>
              <DialogDescription>
                Essa ação é irreversível. O campo será excluído permanentemente
                e não poderá ser recuperado.
              </DialogDescription>
            </DialogHeader>
            <section>
              <form className="pt-4 pb-2">
                <DialogFooter className="inline-flex w-full gap-2 justify-end">
                  <DialogClose asChild>
                    <Button className="bg-destructive hover:bg-destructive">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      onDelete();
                      setDeleteOpen(false);
                    }}
                  >
                    {isDeleting && (
                      <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                    )}
                    {!isDeleting && <span>Confirmar</span>}
                  </Button>
                </DialogFooter>
              </form>
            </section>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// --- Compound Components ---

interface RootProps {
  actions: FieldManagementActions;
  children: React.ReactNode;
}

function FieldManagementRoot({
  actions,
  children,
}: RootProps): React.JSX.Element {
  return (
    <FieldManagementProvider value={actions}>
      <div
        data-test-id="field-management"
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        {children}
      </div>
    </FieldManagementProvider>
  );
}

interface HeaderProps {
  title: string;
  onBack: () => void;
}

function FieldManagementHeader({
  title,
  onBack,
}: HeaderProps): React.JSX.Element {
  return (
    <div className="shrink-0 p-2 flex flex-row justify-between gap-1">
      <div className="inline-flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
        >
          <ArrowLeftIcon />
        </Button>
        <h1 className="text-xl font-medium">{title}</h1>
      </div>
    </div>
  );
}

function FieldManagementTabs(): React.JSX.Element {
  const { fields } = useFieldManagement();

  const nonNativeFields = fields.filter((f) => !f.native);
  const trashedCount = nonNativeFields.filter((f) => f.trashed).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <Tabs
        defaultValue="display"
        className="w-full max-w-6xl mx-auto flex flex-col flex-1 min-h-0"
      >
        <div className="px-4 pt-4 shrink-0">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="display">Lista</TabsTrigger>
            <TabsTrigger value="filter">Filtros</TabsTrigger>
            <TabsTrigger value="form">Formulários</TabsTrigger>
            <TabsTrigger value="detail">Detalhes</TabsTrigger>
            <TabsTrigger
              value="trashed"
              disabled={trashedCount === 0}
            >
              Lixeira{trashedCount > 0 && ` (${trashedCount})`}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="display"
          className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
        >
          <FieldManagementList visibilityKey="showInList" />
        </TabsContent>

        <TabsContent
          value="filter"
          className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
        >
          <FieldManagementList visibilityKey="showInFilter" />
        </TabsContent>

        <TabsContent
          value="form"
          className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
        >
          <FieldManagementList
            visibilityKey="showInForm"
            excludeNative
          />
        </TabsContent>

        <TabsContent
          value="detail"
          className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
        >
          <FieldManagementList visibilityKey="showInDetail" />
        </TabsContent>

        <TabsContent
          value="trashed"
          className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
        >
          <FieldManagementTrashedList excludeNative />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ListProps {
  visibilityKey: VisibilityKey;
  excludeNative?: boolean;
}

function FieldManagementList({
  visibilityKey,
  excludeNative,
}: ListProps): React.JSX.Element {
  const {
    fields: allFields,
    fieldOrderList,
    fieldOrderForm,
    fieldOrderFilter,
    fieldOrderDetail,
    onToggleVisibility,
    onChangeWidth,
    onSaveOrder,
    onEditField,
    togglingFieldId,
    changingWidthFieldId,
    isSavingOrder,
  } = useFieldManagement();

  const orderArray = React.useMemo(() => {
    if (visibilityKey === 'showInList') return fieldOrderList;
    if (visibilityKey === 'showInForm') return fieldOrderForm;
    if (visibilityKey === 'showInFilter') return fieldOrderFilter;
    if (visibilityKey === 'showInDetail') return fieldOrderDetail;
    return [];
  }, [
    visibilityKey,
    fieldOrderList,
    fieldOrderForm,
    fieldOrderFilter,
    fieldOrderDetail,
  ]);

  const managedFields = React.useMemo(
    () => allFields.filter((f) => isManageableField(f, excludeNative)),
    [allFields, excludeNative],
  );

  const [orderedIds, setOrderedIds] = useState<Array<string>>(() => {
    if (orderArray.length === 0) return managedFields.map((f) => f._id);
    return [...managedFields]
      .sort((a, b) => {
        const idxA = orderArray.indexOf(a._id);
        const idxB = orderArray.indexOf(b._id);
        let rankA = idxA;
        if (idxA === -1) rankA = Infinity;
        let rankB = idxB;
        if (idxB === -1) rankB = Infinity;
        return rankA - rankB;
      })
      .map((f) => f._id);
  });
  const [hasChanges, setHasChanges] = useState(false);

  const orderedFields = React.useMemo(() => {
    if (orderedIds.length === 0) return managedFields;
    return [...managedFields].sort((a, b) => {
      const idxA = orderedIds.indexOf(a._id);
      const idxB = orderedIds.indexOf(b._id);
      let rankA = idxA;
      if (idxA === -1) rankA = Infinity;
      let rankB = idxB;
      if (idxB === -1) rankB = Infinity;
      return rankA - rankB;
    });
  }, [managedFields, orderedIds]);

  const visibleFields = orderedFields.filter((f) =>
    fieldVisibilityValue(f, visibilityKey),
  );
  const hiddenFields = orderedFields.filter(
    (f) => !fieldVisibilityValue(f, visibilityKey),
  );

  let widthKey: 'widthInForm' | 'widthInList' | 'widthInDetail' | undefined;
  if (visibilityKey === 'showInForm') {
    widthKey = 'widthInForm';
  } else if (visibilityKey === 'showInList') {
    widthKey = 'widthInList';
  } else if (visibilityKey === 'showInDetail') {
    widthKey = 'widthInDetail';
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeField = orderedFields.find((f) => f._id === active.id);
    const overField = orderedFields.find((f) => f._id === over.id);
    if (!activeField || !overField) return;

    // Bloqueia mover entre as secoes (visivel/oculto); olho faz essa troca.
    if (
      fieldVisibilityValue(activeField, visibilityKey) !==
      fieldVisibilityValue(overField, visibilityKey)
    ) {
      return;
    }

    setOrderedIds((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      return arrayMove(prev, oldIndex, newIndex);
    });
    setHasChanges(true);
  }

  function handleSave(): void {
    const ids = [...visibleFields, ...hiddenFields].map((f) => f._id);
    onSaveOrder(visibilityKey, ids);
    setHasChanges(false);
  }

  function handleToggleVisibility(field: IField): void {
    const currentValue = fieldVisibilityValue(field, visibilityKey);
    onToggleVisibility(field, visibilityKey, !currentValue);
  }

  function handleWidthChange(field: IField, newWidth: number): void {
    if (!widthKey) return;
    onChangeWidth(field, widthKey, newWidth);
  }

  // Sincroniza IDs quando campos são adicionados ou removidos (não para toggle).
  useEffect(() => {
    const updatedIds = allFields
      .filter((f) => isManageableField(f, excludeNative))
      .map((f) => f._id);
    setOrderedIds((prev) => {
      const kept = prev.filter((id) => updatedIds.includes(id));
      const added = updatedIds.filter((id) => !prev.includes(id));
      if (kept.length === prev.length && added.length === 0) return prev;
      return [...kept, ...added];
    });
  }, [allFields, excludeNative]);

  function renderField(field: IField, dimmed: boolean): React.JSX.Element {
    let onWidthChange: ((width: number) => void) | undefined;
    if (widthKey) {
      onWidthChange = (width: number): void => handleWidthChange(field, width);
    }
    return (
      <SortableManagementItem
        key={field._id}
        field={field}
        dimmed={dimmed}
        disabled={isSavingOrder}
        visibilityKey={visibilityKey}
        widthKey={widthKey}
        onEdit={(): void => onEditField(field._id)}
        onToggleVisibility={(): void => handleToggleVisibility(field)}
        onWidthChange={onWidthChange}
        isTogglingVisibility={togglingFieldId === field._id}
        isChangingWidth={changingWidthFieldId === field._id}
      />
    );
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {visibleFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Visíveis
              </p>
              <SortableContext
                items={visibleFields.map((f) => f._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {visibleFields.map((field) => renderField(field, false))}
                </div>
              </SortableContext>
            </div>
          )}

          {hiddenFields.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Ocultos
              </p>
              <SortableContext
                items={hiddenFields.map((f) => f._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {hiddenFields.map((field) => renderField(field, true))}
                </div>
              </SortableContext>
            </div>
          )}
        </div>
      </DndContext>

      {orderedFields.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Nenhum campo cadastrado
        </p>
      )}

      {hasChanges && (
        <Button
          className="w-full"
          disabled={!hasChanges || isSavingOrder}
          onClick={handleSave}
        >
          {isSavingOrder && (
            <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
          )}
          Salvar ordem
        </Button>
      )}
    </div>
  );
}

interface TrashedListProps {
  excludeNative?: boolean;
}

function FieldManagementTrashedList({
  excludeNative,
}: TrashedListProps): React.JSX.Element | null {
  const {
    fields,
    onDeleteField,
    onRestoreField,
    onEditField,
    deletingFieldId,
    restoringFieldId,
  } = useFieldManagement();

  const trashedFields = fields.filter(
    (f) => f.trashed && !(excludeNative && f.native),
  );

  if (trashedFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {trashedFields.map((field) => (
        <TrashedItem
          key={field._id}
          field={field}
          onEdit={() => onEditField(field._id)}
          onDelete={() => onDeleteField(field)}
          onRestore={() => onRestoreField(field)}
          isDeleting={deletingFieldId === field._id}
          isRestoring={restoringFieldId === field._id}
        />
      ))}
    </div>
  );
}

export const FieldManagement = {
  Root: FieldManagementRoot,
  Header: FieldManagementHeader,
  Tabs: FieldManagementTabs,
  List: FieldManagementList,
  TrashedList: FieldManagementTrashedList,
};
