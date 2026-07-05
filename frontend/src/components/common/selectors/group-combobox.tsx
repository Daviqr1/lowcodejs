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
import { USER_GROUP_MAPPER } from '@/lib/constant';
import type { IGroup } from '@/lib/interfaces';

type GroupComboboxProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

// Usa o nome amigavel para grupos de sistema (Master/Administrador/...).
function resolveGroupName(group: IGroup): string {
  for (const [slug, label] of Object.entries(USER_GROUP_MAPPER)) {
    if (slug === group.slug) return label;
  }
  return group.name;
}

export function GroupCombobox({
  value = '',
  onValueChange,
  placeholder = 'Selecione um grupo...',
  className,
  disabled = false,
}: GroupComboboxProps): React.JSX.Element {
  const { data: groups, status } = useGroupReadList();

  const items =
    groups?.map((g) => {
      return { ...g, name: resolveGroupName(g) };
    }) ?? [];

  // Find selected group
  const selectedGroup = React.useMemo(() => {
    return items.find((g) => g._id === value) ?? null;
  }, [items, value]);

  return (
    <Combobox
      data-slot="group-combobox"
      data-test-id="group-combobox"
      items={items}
      value={selectedGroup}
      onValueChange={(group: IGroup | null) => {
        onValueChange?.(group?._id ?? '');
      }}
      itemToStringLabel={(group: IGroup) => group.name}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={selectedGroup?.name || placeholder}
        showClear={!!selectedGroup}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>Nenhum grupo encontrado.</ComboboxEmpty>
        {status === 'pending' && (
          <div className="flex items-center justify-center p-3">
            <Spinner className="opacity-50" />
          </div>
        )}
        {status === 'success' && (
          <ComboboxList>
            {(group: IGroup): React.ReactNode => (
              <ComboboxItem
                key={group._id}
                value={group}
              >
                {group.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
