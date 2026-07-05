import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useReadTable } from '@/hooks/tanstack-query/use-table-read';
import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField, IRelationshipLabelPart } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

/** Profundidade máxima de navegação em relacionamentos aninhados. */
const MAX_DEPTH = 5;

/** Tipos que não fazem sentido como parte de um label. */
const EXCLUDED_TYPES = new Set<string>([
  E_FIELD_TYPE.FIELD_GROUP,
  E_FIELD_TYPE.REACTION,
  E_FIELD_TYPE.EVALUATION,
  E_FIELD_TYPE.FILE,
]);

const SEPARATOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: ' - ', label: '-' },
  { value: ' | ', label: '|' },
  { value: ' / ', label: '/' },
  { value: ' · ', label: '·' },
  { value: ' ', label: '␣' },
  { value: ', ', label: ',' },
];

type TableFieldRelationshipLabelComposerProps = {
  rootTableSlug: string;
  parts: Array<IRelationshipLabelPart>;
  separator: string;
  onChange: (parts: Array<IRelationshipLabelPart>, separator: string) => void;
  disabled?: boolean;
};

type Step = {
  tableSlug: string;
  field: IField | null;
};

function isNavigable(field: IField): boolean {
  return (
    field.type === E_FIELD_TYPE.RELATIONSHIP &&
    Boolean(field.relationship?.table?.slug)
  );
}

function selectableFields(fields: Array<IField>): Array<IField> {
  return fields.filter(
    (field) =>
      !field.native && !field.trashed && !EXCLUDED_TYPES.has(field.type),
  );
}

/**
 * Um nível do navegador: lista os campos da tabela `tableSlug` e permite
 * escolher um. Campos de relacionamento são marcados com "→".
 */
function LevelSelect({
  tableSlug,
  selectedSlug,
  onSelect,
  disabled,
}: {
  tableSlug: string;
  selectedSlug: string;
  onSelect: (field: IField) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const { data, status } = useReadTable({ slug: tableSlug });
  const fields = React.useMemo(
    () => selectableFields(data?.fields ?? []),
    [data?.fields],
  );

  return (
    <Select
      value={selectedSlug || undefined}
      onValueChange={(slug) => {
        const field = fields.find((item) => item.slug === slug);
        if (field) onSelect(field);
      }}
      disabled={disabled || status === 'pending'}
    >
      <SelectTrigger className="h-8 min-w-[150px] text-xs">
        <SelectValue placeholder="— escolha —" />
      </SelectTrigger>
      <SelectContent>
        {fields.map((field) => (
          <SelectItem
            key={field._id}
            value={field.slug}
          >
            {field.name}
            {isNavigable(field) && ' →'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TableFieldRelationshipLabelComposer({
  rootTableSlug,
  parts,
  separator,
  onChange,
  disabled,
}: TableFieldRelationshipLabelComposerProps): React.JSX.Element {
  const rootTable = useReadTable({ slug: rootTableSlug });
  const [steps, setSteps] = React.useState<Array<Step>>([
    { tableSlug: rootTableSlug, field: null },
  ]);

  // Reinicia a navegação quando a tabela raiz muda.
  React.useEffect(() => {
    setSteps([{ tableSlug: rootTableSlug, field: null }]);
  }, [rootTableSlug]);

  const effectiveSeparator = separator || ' - ';

  const handleSelectAtLevel = (index: number, field: IField): void => {
    const next: Array<Step> = steps.slice(0, index + 1);
    next[index] = { ...next[index], field };

    const nextTableSlug = field.relationship?.table?.slug;
    if (isNavigable(field) && nextTableSlug && next.length < MAX_DEPTH) {
      next.push({ tableSlug: nextTableSlug, field: null });
    }
    setSteps(next);
  };

  const selectedFields = steps
    .map((step) => step.field)
    .filter((field): field is IField => field !== null);

  const lastField = selectedFields[selectedFields.length - 1] ?? null;
  const currentPath = selectedFields.map((field) => field.slug).join('.');
  const currentLabel = selectedFields.map((field) => field.name).join(' › ');
  const canAdd =
    lastField !== null &&
    !isNavigable(lastField) &&
    currentPath !== '' &&
    !parts.some((part) => part.path === currentPath);

  const handleAdd = (): void => {
    if (!canAdd) return;
    onChange(
      [...parts, { path: currentPath, label: currentLabel }],
      effectiveSeparator,
    );
    setSteps([{ tableSlug: rootTableSlug, field: null }]);
  };

  const handleRemove = (path: string): void => {
    onChange(
      parts.filter((part) => part.path !== path),
      effectiveSeparator,
    );
  };

  const handleMove = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= parts.length) return;
    const next = [...parts];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next, effectiveSeparator);
  };

  if (!rootTableSlug) {
    return (
      <p className="text-muted-foreground text-sm">
        Configure a tabela de relacionamento primeiro.
      </p>
    );
  }

  return (
    <div
      data-slot="table-field-relationship-label-composer"
      className="space-y-3 rounded-md border p-3"
    >
      {/* Navegador de campos */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">
          Adicionar campo ao label
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-muted rounded px-2 py-1 text-xs">
            {rootTable.data?.name ?? rootTableSlug}
          </span>
          {steps.map((step, index) => (
            // A key inclui o slug selecionado para forçar o remount do Radix
            // Select quando o nível é resetado (field -> null). Sem isso, ao
            // passar value de 'autor' para undefined o Radix vira uncontrolled
            // e retém "Autor" no visual, sem recriar o select do subcampo.
            <React.Fragment
              key={`${index}-${step.tableSlug}-${step.field?.slug ?? '∅'}`}
            >
              <span className="text-muted-foreground text-xs">›</span>
              <LevelSelect
                tableSlug={step.tableSlug}
                selectedSlug={step.field?.slug ?? ''}
                onSelect={(field) => handleSelectAtLevel(index, field)}
                disabled={disabled}
              />
            </React.Fragment>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto h-8"
            disabled={disabled || !canAdd}
            onClick={handleAdd}
          >
            <PlusIcon className="size-3.5" />
            Adicionar
          </Button>
        </div>
        {rootTable.status === 'pending' && (
          <Spinner className="size-4 opacity-50" />
        )}
      </div>

      {/* Template do label */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">
          Template do label
        </p>
        {parts.length === 0 && (
          <p className="text-muted-foreground text-xs italic">
            Nenhum campo adicionado. O label usará o campo principal selecionado
            acima.
          </p>
        )}
        {parts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {parts.map((part, index) => (
              <React.Fragment key={part.path}>
                {index > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {effectiveSeparator.trim() || '␣'}
                  </span>
                )}
                <div className="bg-background flex items-center gap-0.5 rounded-md border py-1 pr-1 pl-2 text-xs">
                  <span title={part.path}>{part.label || part.path}</span>
                  <button
                    type="button"
                    aria-label="Mover para esquerda"
                    className="hover:bg-muted rounded p-0.5 disabled:opacity-30"
                    disabled={disabled || index === 0}
                    onClick={() => handleMove(index, -1)}
                  >
                    <ArrowLeftIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mover para direita"
                    className="hover:bg-muted rounded p-0.5 disabled:opacity-30"
                    disabled={disabled || index === parts.length - 1}
                    onClick={() => handleMove(index, 1)}
                  >
                    <ArrowRightIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remover"
                    className="hover:bg-muted text-muted-foreground rounded p-0.5"
                    disabled={disabled}
                    onClick={() => handleRemove(part.path)}
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="flex items-center gap-2">
        <p className="text-muted-foreground text-xs font-medium">Separador:</p>
        <div className="flex flex-wrap gap-1">
          {SEPARATOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              className={cn(
                'rounded border px-2 py-0.5 font-mono text-xs',
                effectiveSeparator === option.value &&
                  'border-primary bg-primary/10 text-primary',
                effectiveSeparator !== option.value && 'hover:bg-muted',
              )}
              onClick={() => onChange(parts, option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
