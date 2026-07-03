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

interface ValidationOption {
  value: string;
  label: string;
  async?: boolean;
}

interface ValidationMultiSelectProps {
  options: Array<ValidationOption>;
  value?: Array<string>;
  onValueChange?: (value: Array<string>) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ValidationMultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder = 'Selecione validações...',
  disabled = false,
}: ValidationMultiSelectProps): React.JSX.Element {
  const anchorRef = useComboboxAnchor();

  const selectedOptions = React.useMemo(
    () => options.filter((opt) => value.includes(opt.value)),
    [options, value],
  );

  return (
    <Combobox
      data-slot="validation-multi-select"
      data-test-id="validation-multi-select"
      items={options}
      multiple
      value={selectedOptions}
      onValueChange={(newOptions: Array<ValidationOption>) => {
        onValueChange?.(newOptions.map((o) => o.value));
      }}
      itemToStringLabel={(opt: ValidationOption) => opt.label}
      disabled={disabled}
    >
      <ComboboxChips ref={anchorRef}>
        <ComboboxValue>
          {(selectedValue: Array<ValidationOption>): React.ReactNode => {
            let chipsPlaceholder = placeholder;
            if (selectedValue.length > 0) chipsPlaceholder = '';
            return (
              <React.Fragment>
                {selectedValue.map((opt) => (
                  <ComboboxChip
                    key={opt.value}
                    aria-label={opt.label}
                  >
                    {opt.label}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={chipsPlaceholder} />
              </React.Fragment>
            );
          }}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchorRef}>
        <ComboboxEmpty>Nenhuma validação encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(opt: ValidationOption): React.ReactNode => (
            <ComboboxItem
              key={opt.value}
              value={opt}
            >
              <div className="flex flex-1 items-center justify-between gap-2">
                <span>{opt.label}</span>
                {opt.async && (
                  <span className="text-muted-foreground text-xs">
                    servidor
                  </span>
                )}
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
