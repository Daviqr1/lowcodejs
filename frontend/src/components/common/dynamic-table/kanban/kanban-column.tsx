import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  GripVerticalIcon,
} from 'lucide-react';
import React from 'react';

import {
  badgeStyleFromColor,
  hexToRgb,
} from '@/components/common/dynamic-table/table-cells/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IDropdown } from '@/lib/interfaces';
import {
  columnHeaderStyleFromColor,
  columnStyleFromColor,
} from '@/lib/kanban-helpers';
import { cn } from '@/lib/utils';

// Sentinela para "sem ordenação por campo" (mantém a ordem manual de drag-drop).
const MANUAL_SORT_VALUE = '__manual__';

export interface KanbanColumnSortFieldOption {
  label: string;
  value: string;
}

export interface KanbanListUpdate {
  label: string;
  color: string | null;
  sortField: string | null;
  sortDirection: 'asc' | 'desc' | null;
}

export function KanbanColumn({
  option,
  count,
  children,
  sortFieldOptions,
  onUpdate,
  isUpdating,
}: {
  option: IDropdown;
  count: number;
  children: React.ReactNode;
  sortFieldOptions: Array<KanbanColumnSortFieldOption>;
  onUpdate: (optionId: string, update: KanbanListUpdate) => void;
  isUpdating?: boolean;
}): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: option.id,
    data: { type: 'column', columnId: option.id },
  });

  const [isEditing, setIsEditing] = React.useState(false);
  const [label, setLabel] = React.useState(option.label);
  const [color, setColor] = React.useState(option.color ?? '#64748b');
  const [sortField, setSortField] = React.useState(
    option.sortField ?? MANUAL_SORT_VALUE,
  );
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(
    option.sortDirection ?? 'asc',
  );

  // Sincroniza o formulário com a opção sempre que o popover abre.
  React.useEffect(() => {
    if (!isEditing) return;
    setLabel(option.label);
    setColor(option.color ?? '#64748b');
    setSortField(option.sortField ?? MANUAL_SORT_VALUE);
    setSortDirection(option.sortDirection ?? 'asc');
  }, [isEditing, option]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const columnStyle = columnStyleFromColor(option.color);
  const scrollStyle = React.useMemo<React.CSSProperties | undefined>(() => {
    if (!option.color) return undefined;
    const rgb = hexToRgb(option.color);
    if (!rgb) return undefined;
    const vars: React.CSSProperties & Record<`--${string}`, string> = {
      '--kanban-scroll-thumb': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
      '--kanban-scroll-thumb-hover': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`,
    };
    return vars;
  }, [option.color]);

  function handleSave(): void {
    const nextLabel = label.trim();
    if (!nextLabel) return;
    const useField = sortField !== MANUAL_SORT_VALUE;
    let nextSortField: typeof sortField | null = null;
    if (useField) nextSortField = sortField;
    let nextSortDirection: typeof sortDirection | null = null;
    if (useField) nextSortDirection = sortDirection;
    onUpdate(option.id, {
      label: nextLabel,
      color,
      sortField: nextSortField,
      sortDirection: nextSortDirection,
    });
    setIsEditing(false);
  }

  // Hint de ordenação automática: quando a lista tem campo de ordenação, a ordem
  // manual de drag-drop é ignorada — sinaliza isso no header.
  const sortLabel = sortFieldOptions.find(
    (field) => field.value === option.sortField,
  )?.label;
  const hasSort = Boolean(option.sortField) && Boolean(sortLabel);

  return (
    <section
      data-slot="kanban-column"
      data-test-id={`kanban-column-${option.id}`}
      ref={setNodeRef}
      style={{ ...style, ...columnStyle }}
      className={cn(
        'w-72 shrink-0 rounded-md border bg-muted/30 overflow-hidden flex flex-col h-full min-h-0',
        isDragging && 'opacity-80',
      )}
    >
      <div
        className="flex items-center justify-between border-b bg-background/60 px-4 py-3"
        style={columnHeaderStyleFromColor(option.color)}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab text-muted-foreground hover:text-foreground"
            aria-label="Arrastar lista"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <Popover
            open={isEditing}
            onOpenChange={setIsEditing}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-start text-left cursor-pointer"
                title="Configurar lista"
              >
                <span className="text-base font-semibold">{option.label}</span>
                {hasSort && (
                  <span className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                    {option.sortDirection === 'desc' && (
                      <ArrowDownWideNarrowIcon className="size-3" />
                    )}
                    {option.sortDirection !== 'desc' && (
                      <ArrowUpNarrowWideIcon className="size-3" />
                    )}
                    {sortLabel}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-72 space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`kanban-list-name-${option.id}`}>Nome</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`kanban-list-name-${option.id}`}
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSave();
                      }
                    }}
                    autoFocus
                  />
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-9 w-10 shrink-0 rounded border bg-transparent p-0"
                    aria-label="Cor da lista"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Ordenar por</Label>
                <Select
                  value={sortField}
                  onValueChange={setSortField}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MANUAL_SORT_VALUE}>
                      Ordem manual
                    </SelectItem>
                    {sortFieldOptions.map((field) => (
                      <SelectItem
                        key={field.value}
                        value={field.value}
                      >
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Direção</Label>
                <Select
                  value={sortDirection}
                  onValueChange={(value) => {
                    if (value === 'asc' || value === 'desc') {
                      setSortDirection(value);
                    }
                  }}
                  disabled={sortField === MANUAL_SORT_VALUE}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a direção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascendente (A–Z, 0–9)</SelectItem>
                    <SelectItem value="desc">Descendente (Z–A, 9–0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isUpdating || !label.trim()}
                >
                  Salvar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Badge
          variant="outline"
          style={badgeStyleFromColor(option.color)}
        >
          {count}
        </Badge>
      </div>
      <div
        className="space-y-3 px-2 pb-2 pt-2 flex-1 min-h-0 overflow-y-auto kanban-scroll"
        style={scrollStyle}
      >
        {children}
      </div>
    </section>
  );
}
