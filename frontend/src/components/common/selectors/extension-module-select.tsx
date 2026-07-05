import * as React from 'react';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExtensionsActiveList } from '@/hooks/tanstack-query/use-extensions-active-list';
import { E_EXTENSION_TYPE } from '@/lib/constant';
import type { IMenuExtensionRef } from '@/lib/interfaces';

type ExtensionModuleSelectProps = {
  label: string;
  value: IMenuExtensionRef | null | undefined;
  onValueChange: (value: IMenuExtensionRef | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
};

function buildKey(ref: IMenuExtensionRef | null | undefined): string {
  if (!ref) return '';
  return `${ref.pkg}::${ref.extensionId}`;
}

function parseKey(key: string): IMenuExtensionRef | null {
  if (!key) return null;
  const [pkg, extensionId] = key.split('::');
  if (!pkg || !extensionId) return null;
  return { pkg, extensionId };
}

export function ExtensionModuleSelect({
  label,
  value,
  onValueChange,
  placeholder = 'Selecione um módulo',
  disabled,
  required,
  error,
}: ExtensionModuleSelectProps): React.JSX.Element {
  const { data, isLoading } = useExtensionsActiveList();

  const modules = React.useMemo(
    () => (data ?? []).filter((e) => e.type === E_EXTENSION_TYPE.MODULE),
    [data],
  );

  const selectedKey = buildKey(value);
  const isInvalid = Boolean(error);

  return (
    <Field
      data-slot="extension-module-select"
      data-test-id="extension-module-select"
      data-invalid={isInvalid}
    >
      <FieldLabel>
        {label} {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <Select
        disabled={disabled || isLoading}
        value={selectedKey}
        onValueChange={(key) => onValueChange(parseKey(key))}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {modules.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum módulo ativo. Ative um em /extensions.
            </div>
          )}
          {modules.map((extension) => (
            <SelectItem
              key={extension._id}
              value={buildKey({
                pkg: extension.pkg,
                extensionId: extension.extensionId,
              })}
            >
              {extension.name}
              <span className="ml-2 text-xs text-muted-foreground font-mono">
                {extension.pkg}/{extension.extensionId}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={[{ message: error ?? '' }]} />}
    </Field>
  );
}
