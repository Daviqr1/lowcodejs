import { ValidationMultiSelect } from './validation-multi-select';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_FIELD_VALIDATION, FIELD_VALIDATION_OPTIONS } from '@/lib/constant';
import type { IFieldValidation, ValueOf } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type TableFieldValidationsFieldProps = {
  // Aceita string crua (vem do store do form) — comparada contra E_FIELD_TYPE.
  label: string;
  fieldType: string;
  multiple?: boolean;
  disabled?: boolean;
};

type ValidationOption = (typeof FIELD_VALIDATION_OPTIONS)[number];

const CONFIG_RULES = [
  E_FIELD_VALIDATION.IS_IN_RANGE,
  E_FIELD_VALIDATION.IS_NOT,
] as const satisfies ReadonlyArray<ValueOf<typeof E_FIELD_VALIDATION>>;

function isMultipleOnly(option: ValidationOption): boolean {
  return 'multipleOnly' in option && option.multipleOnly === true;
}

function appliesToField(
  option: ValidationOption,
  fieldType: string,
  multiple: boolean,
): boolean {
  const typeOk =
    option.types.length === 0 ||
    option.types.some((type) => type === fieldType);
  if (!typeOk) return false;
  if (isMultipleOnly(option) && !multiple) return false;
  return true;
}

function readConfigString(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = config[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function readConfigValuesCsv(config: Record<string, unknown>): string {
  if (Array.isArray(config.values))
    return config.values.map((item) => String(item)).join(', ');
  return '';
}

export function TableFieldValidationsField({
  label,
  fieldType,
  multiple = false,
  disabled,
}: TableFieldValidationsFieldProps): React.JSX.Element {
  const field = useFieldContext<Array<IFieldValidation>>();
  const value = field.state.value ?? [];
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const options = FIELD_VALIDATION_OPTIONS.filter((option) =>
    appliesToField(option, fieldType, multiple),
  );

  const simpleOptions = options.filter(
    (o) => !CONFIG_RULES.some((r) => r === o.value),
  );
  const configOptions = options.filter((o) =>
    CONFIG_RULES.some((r) => r === o.value),
  );

  const simpleActive = value
    .filter((v) => !CONFIG_RULES.some((r) => r === v.rule))
    .map((v) => v.rule);

  function handleSimpleChange(rules: Array<string>): void {
    const configValidations = value.filter((v) =>
      CONFIG_RULES.some((r) => r === v.rule),
    );
    const newSimple: Array<IFieldValidation> = rules.map((r) => ({
      // `rules` vem do multi-select cujas opcoes sao valores de E_FIELD_VALIDATION;
      // o cast reduz o string ao enum (garantido pela origem das opcoes).
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      rule: r as ValueOf<typeof E_FIELD_VALIDATION>,
      config: {},
    }));
    field.handleChange([...newSimple, ...configValidations]);
  }

  function toggle(
    rule: ValueOf<typeof E_FIELD_VALIDATION>,
    checked: boolean,
  ): void {
    let next: Array<IFieldValidation> = [];
    if (checked) next = [...value, { rule, config: {} }];
    if (!checked) next = value.filter((item) => item.rule !== rule);
    field.handleChange(next);
  }

  function updateConfig(
    rule: ValueOf<typeof E_FIELD_VALIDATION>,
    patch: Record<string, unknown>,
  ): void {
    const next = value.map((item) => {
      if (item.rule !== rule) return item;
      return { ...item, config: { ...item.config, ...patch } };
    });
    field.handleChange(next);
  }

  return (
    <Field
      data-slot="table-field-validations-field"
      data-test-id="table-field-validations-field"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>

      {options.length === 0 && (
        <FieldDescription>
          Nenhuma validação disponível para este tipo de campo.
        </FieldDescription>
      )}

      {options.length > 0 && (
        <div className="flex flex-col gap-3">
          {simpleOptions.length > 0 && (
            <ValidationMultiSelect
              options={simpleOptions}
              value={simpleActive}
              onValueChange={handleSimpleChange}
              disabled={disabled}
            />
          )}

          {configOptions.map((option) => {
            const selected = value.find((item) => item.rule === option.value);
            const checked = Boolean(selected);
            const checkboxId = 'validation-' + option.value;

            return (
              <div
                key={option.value}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(state) =>
                      toggle(option.value, state === true)
                    }
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="font-normal"
                  >
                    {option.label}
                  </Label>
                  {option.async && (
                    <span className="text-muted-foreground text-xs">
                      (validado no servidor)
                    </span>
                  )}
                </div>

                {checked && option.value === E_FIELD_VALIDATION.IS_IN_RANGE && (
                  <div className="ml-6 flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Mínimo"
                      disabled={disabled}
                      value={readConfigString(selected!.config, 'min')}
                      onChange={(event) =>
                        updateConfig(option.value, {
                          min: event.target.value,
                        })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Máximo"
                      disabled={disabled}
                      value={readConfigString(selected!.config, 'max')}
                      onChange={(event) =>
                        updateConfig(option.value, {
                          max: event.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {checked && option.value === E_FIELD_VALIDATION.IS_NOT && (
                  <div className="ml-6">
                    <Input
                      placeholder="Valores não permitidos (separados por vírgula)"
                      disabled={disabled}
                      value={readConfigValuesCsv(selected!.config)}
                      onChange={(event) =>
                        updateConfig(option.value, {
                          values: event.target.value
                            .split(',')
                            .map((item) => item.trim())
                            .filter((item) => item.length > 0),
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isInvalid && (
        <FieldError
          className={cn('mt-1')}
          errors={field.state.meta.errors}
        />
      )}
    </Field>
  );
}
