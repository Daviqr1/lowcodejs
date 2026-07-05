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
import { usePermissionRead } from '@/hooks/tanstack-query/use-permission-read';
import { PERMISSION_LABEL_MAPPER } from '@/lib/constant';
import type { IPermission } from '@/lib/interfaces';

type PermissionMultiSelectProps = {
  value?: Array<string>;
  onValueChange?: (value: Array<string>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function PermissionMultiSelect({
  value = [],
  onValueChange,
  placeholder = 'Selecione permissões...',
  className,
  disabled = false,
}: PermissionMultiSelectProps): React.JSX.Element {
  const anchorRef = useComboboxAnchor();
  const { data: permissions, status } = usePermissionRead();

  const items = permissions ?? [];

  // Map selected IDs to permission objects
  const selectedPermissions = React.useMemo(() => {
    return items.filter((permission) => value.includes(permission._id));
  }, [items, value]);

  return (
    <Combobox
      data-slot="permission-multi-select"
      data-test-id="permission-multi-select"
      items={items}
      multiple
      value={selectedPermissions}
      onValueChange={(newPermissions: Array<IPermission>) => {
        onValueChange?.(newPermissions.map((p) => p._id));
      }}
      itemToStringLabel={(permission: IPermission) =>
        PERMISSION_LABEL_MAPPER[permission.slug] ?? permission.name
      }
      disabled={disabled}
    >
      <ComboboxChips
        ref={anchorRef}
        className={className}
      >
        <ComboboxValue>
          {(selectedValue: Array<IPermission>): React.ReactNode => {
            let chipsPlaceholder = placeholder;
            if (selectedValue.length > 0) {
              chipsPlaceholder = '';
            }
            return (
              <React.Fragment>
                {selectedValue.map((permission) => (
                  <ComboboxChip
                    key={permission._id}
                    aria-label={
                      PERMISSION_LABEL_MAPPER[permission.slug] ??
                      permission.name
                    }
                  >
                    {PERMISSION_LABEL_MAPPER[permission.slug] ??
                      permission.name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={chipsPlaceholder} />
              </React.Fragment>
            );
          }}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty>Nenhuma permissão encontrada.</ComboboxEmpty>
        {status === 'pending' && (
          <div className="flex items-center justify-center p-3">
            <Spinner className="opacity-50" />
          </div>
        )}
        {status !== 'pending' && (
          <ComboboxList>
            {(permission: IPermission): React.ReactNode => (
              <ComboboxItem
                key={permission._id}
                value={permission}
              >
                <div className="flex flex-1 flex-col">
                  <span className="font-medium">
                    {PERMISSION_LABEL_MAPPER[permission.slug] ??
                      permission.name}
                  </span>
                  {permission.description && (
                    <span className="text-muted-foreground text-sm">
                      {permission.description}
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
