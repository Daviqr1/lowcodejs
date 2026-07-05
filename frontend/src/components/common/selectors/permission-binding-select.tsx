import * as React from 'react';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Spinner } from '@/components/ui/spinner';
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { E_PERMISSION_TARGET, USER_GROUP_MAPPER } from '@/lib/constant';
import type { IPermissionBinding } from '@/lib/interfaces';

// Ids sintéticos para as opções fixas (que não são grupos).
const PUBLIC_ID = '__PUBLIC__';
const NOBODY_ID = '__NOBODY__';

type Option = { id: string; label: string; description?: string };

// Descrições das opções fixas — explicam o efeito de cada binding (pedido do QA:
// "explicar o que cada opção faz"). GROUP é descrito por opção de grupo abaixo.
const PUBLIC_DESCRIPTION =
  'Qualquer pessoa, mesmo sem login, pode realizar esta ação.';
const NOBODY_DESCRIPTION = 'Ninguém pode realizar esta ação (bloqueado).';
const GROUP_DESCRIPTION =
  'Apenas membros deste grupo que também tenham a permissão correspondente no grupo (regra de interseção).';

type PermissionBindingSelectProps = {
  value?: IPermissionBinding;
  onValueChange?: (value: IPermissionBinding) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function groupLabel(slug: string, name: string): string {
  for (const [groupSlug, label] of Object.entries(USER_GROUP_MAPPER)) {
    if (groupSlug === slug) return label;
  }
  return name;
}

// Converte o binding persistido no id da opção selecionada.
function bindingToId(binding: IPermissionBinding | undefined): string {
  if (!binding) return NOBODY_ID;
  if (binding.kind === E_PERMISSION_TARGET.PUBLIC) return PUBLIC_ID;
  if (binding.kind === E_PERMISSION_TARGET.GROUP) return binding.group ?? '';
  return NOBODY_ID;
}

// Converte a opção selecionada de volta para um binding.
function idToBinding(id: string): IPermissionBinding {
  if (id === PUBLIC_ID)
    return { kind: E_PERMISSION_TARGET.PUBLIC, group: null };
  if (id === NOBODY_ID)
    return { kind: E_PERMISSION_TARGET.NOBODY, group: null };
  return { kind: E_PERMISSION_TARGET.GROUP, group: id };
}

export function PermissionBindingSelect({
  value,
  onValueChange,
  placeholder = 'Selecione...',
  className,
  disabled = false,
}: PermissionBindingSelectProps): React.JSX.Element {
  const { data: groups, status } = useGroupReadList();

  const items = React.useMemo(() => {
    const fixed: Array<Option> = [
      {
        id: PUBLIC_ID,
        label: 'Todos (Público)',
        description: PUBLIC_DESCRIPTION,
      },
      { id: NOBODY_ID, label: 'Ninguém', description: NOBODY_DESCRIPTION },
    ];
    const groupOptions = (groups ?? []).map((group) => ({
      id: group._id,
      label: groupLabel(group.slug, group.name),
      description: GROUP_DESCRIPTION,
    }));
    return [...fixed, ...groupOptions];
  }, [groups]);

  const selectedId = bindingToId(value);
  const selected = React.useMemo(() => {
    return items.find((item) => item.id === selectedId) ?? null;
  }, [items, selectedId]);

  return (
    <Combobox
      data-slot="permission-binding-select"
      data-test-id="permission-binding-select"
      items={items}
      value={selected}
      onValueChange={(option: Option | null) => {
        if (!option) return;
        onValueChange?.(idToBinding(option.id));
      }}
      itemToStringLabel={(option: Option) => option.label}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={selected?.label || placeholder}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhuma opção encontrada.</ComboboxEmpty>
        {status === 'pending' && (
          <div className="flex items-center justify-center p-3">
            <Spinner className="opacity-50" />
          </div>
        )}
        {status !== 'pending' && (
          <ComboboxList>
            {(option: Option): React.ReactNode => (
              <ComboboxItem
                key={option.id}
                value={option}
              >
                <div className="flex flex-1 flex-col">
                  <span className="font-medium">{option.label}</span>
                  {option.description && (
                    <span className="text-muted-foreground text-sm">
                      {option.description}
                    </span>
                  )}
                </div>
              </ComboboxItem>
            )}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
