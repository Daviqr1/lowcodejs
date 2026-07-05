import * as React from 'react';

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Spinner } from '@/components/ui/spinner';
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { USER_GROUP_MAPPER } from '@/lib/constant';
import type { IGroup } from '@/lib/interfaces';

type GroupMultiSelectProps = {
  value?: Array<string>;
  onValueChange?: (value: Array<string>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  // Grupo a ocultar da lista (ex.: o proprio grupo em edicao, para nao englobar
  // a si mesmo).
  excludeId?: string;
};

// Usa o nome amigavel para grupos de sistema (Master/Administrador/...).
function resolveGroupName(group: IGroup): string {
  for (const [slug, label] of Object.entries(USER_GROUP_MAPPER)) {
    if (slug === group.slug) return label;
  }
  return group.name;
}

export function GroupMultiSelect({
  value = [],
  onValueChange,
  placeholder = 'Selecione grupos...',
  className,
  disabled = false,
  excludeId,
}: GroupMultiSelectProps): React.JSX.Element {
  const anchorRef = useComboboxAnchor();
  const { data: groups, status } = useGroupReadList();

  const items = React.useMemo(() => {
    const all = groups ?? [];
    return all.filter((group) => group._id !== excludeId);
  }, [groups, excludeId]);

  const selectedGroups = React.useMemo(() => {
    return items.filter((group) => value.includes(group._id));
  }, [items, value]);

  return (
    <Combobox
      data-slot="group-multi-select"
      data-test-id="group-multi-select"
      items={items}
      multiple
      value={selectedGroups}
      onValueChange={(newGroups: Array<IGroup>) => {
        onValueChange?.(newGroups.map((group) => group._id));
      }}
      itemToStringLabel={resolveGroupName}
      disabled={disabled}
    >
      <ComboboxChips
        ref={anchorRef}
        className={className}
      >
        <ComboboxValue>
          {(selectedValue: Array<IGroup>): React.ReactNode => {
            let chipsPlaceholder = placeholder;
            if (selectedValue.length > 0) {
              chipsPlaceholder = '';
            }
            return (
              <React.Fragment>
                {selectedValue.map((group) => (
                  <ComboboxChip
                    key={group._id}
                    aria-label={resolveGroupName(group)}
                  >
                    {resolveGroupName(group)}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={chipsPlaceholder} />
              </React.Fragment>
            );
          }}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty>Nenhum grupo encontrado.</ComboboxEmpty>
        {status === 'pending' && (
          <div className="flex items-center justify-center p-3">
            <Spinner className="opacity-50" />
          </div>
        )}
        {status !== 'pending' && (
          <ComboboxList>
            {(group: IGroup): React.ReactNode => (
              <ComboboxItem
                key={group._id}
                value={group}
              >
                {resolveGroupName(group)}
              </ComboboxItem>
            )}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
