import React from 'react';

import { FIELD_SLUG_REGEX } from './types';
import type { DateWindowSettings } from './types';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Props = {
  value: DateWindowSettings;
  onChange: (value: DateWindowSettings) => void;
  disabled?: boolean;
};

const DEFAULT_SETTINGS_BY_MODE: Record<
  DateWindowSettings['mode'],
  DateWindowSettings
> = {
  off: { mode: 'off' },
  'createdAt-sliding': { mode: 'createdAt-sliding', slidingDays: 30 },
  'createdAt-fixed': {
    mode: 'createdAt-fixed',
    fixedFrom: null,
    fixedTo: null,
  },
  'field-range': {
    mode: 'field-range',
    validFromSlug: 'valid-from',
    validUntilSlug: 'valid-until',
  },
};

export function DateWindowModeSelector({
  value,
  onChange,
  disabled,
}: Props): React.JSX.Element {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function setMode(mode: DateWindowSettings['mode']): void {
    setErrors({});
    onChange(DEFAULT_SETTINGS_BY_MODE[mode]);
  }

  function validateSlug(field: string, slug: string): void {
    if (!FIELD_SLUG_REGEX.test(slug)) {
      setErrors((p) => ({
        ...p,
        [field]: 'letras minúsculas, números e hífens',
      }));
    } else {
      setErrors((p) => {
        const next = { ...p };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel>Modo de janela temporal</FieldLabel>
        <div className="space-y-2">
          {(
            [
              { id: 'off', label: 'Off (sem filtro temporal)' },
              {
                id: 'createdAt-sliding',
                label: 'Últimos N dias (createdAt-sliding)',
              },
              {
                id: 'createdAt-fixed',
                label: 'Intervalo fixo (createdAt-fixed)',
              },
              {
                id: 'field-range',
                label: 'Campos de data na row (field-range)',
              },
            ] as const
          ).map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                checked={value.mode === opt.id}
                onChange={() => setMode(opt.id)}
                disabled={disabled}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </Field>

      {value.mode === 'createdAt-sliding' && (
        <Field>
          <FieldLabel htmlFor="sliding-days">Últimos N dias</FieldLabel>
          <Input
            id="sliding-days"
            type="number"
            min={1}
            max={3650}
            value={String(value.slidingDays)}
            onChange={(e) =>
              onChange({
                mode: 'createdAt-sliding',
                slidingDays: Number(e.target.value) || 1,
              })
            }
            disabled={disabled}
            placeholder="Ex.: 30"
          />
        </Field>
      )}

      {value.mode === 'createdAt-fixed' && (
        <>
          <Field>
            <FieldLabel htmlFor="fixed-from">De</FieldLabel>
            <Input
              id="fixed-from"
              type="date"
              value={value.fixedFrom?.slice(0, 10) ?? ''}
              onChange={(e) => {
                let fixedFrom = null;
                if (e.target.value) {
                  fixedFrom = new Date(e.target.value).toISOString();
                }
                onChange({ ...value, fixedFrom });
              }}
              disabled={disabled}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="fixed-to">Até</FieldLabel>
            <Input
              id="fixed-to"
              type="date"
              value={value.fixedTo?.slice(0, 10) ?? ''}
              onChange={(e) => {
                let fixedTo = null;
                if (e.target.value) {
                  fixedTo = new Date(e.target.value).toISOString();
                }
                onChange({ ...value, fixedTo });
              }}
              disabled={disabled}
            />
          </Field>
        </>
      )}

      {value.mode === 'field-range' && (
        <>
          <Field>
            <FieldLabel htmlFor="valid-from-slug">
              Slug do campo &lsquo;Válido a partir&rsquo;
            </FieldLabel>
            <Input
              id="valid-from-slug"
              type="text"
              value={value.validFromSlug}
              onChange={(e) => {
                onChange({ ...value, validFromSlug: e.target.value });
                validateSlug('validFromSlug', e.target.value);
              }}
              disabled={disabled}
              placeholder="valid-from"
              aria-invalid={Boolean(errors['validFromSlug'])}
            />
            {errors['validFromSlug'] && (
              <FieldError>{errors['validFromSlug']}</FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="valid-until-slug">
              Slug do campo &lsquo;Válido até&rsquo;
            </FieldLabel>
            <Input
              id="valid-until-slug"
              type="text"
              value={value.validUntilSlug}
              onChange={(e) => {
                onChange({ ...value, validUntilSlug: e.target.value });
                validateSlug('validUntilSlug', e.target.value);
              }}
              disabled={disabled}
              placeholder="valid-until"
              aria-invalid={Boolean(errors['validUntilSlug'])}
            />
            {errors['validUntilSlug'] && (
              <FieldError>{errors['validUntilSlug']}</FieldError>
            )}
          </Field>
          <p className="text-xs text-muted-foreground">
            Os campos DATE serão criados automaticamente nas tabelas
            selecionadas se ainda não existirem.
          </p>
        </>
      )}
    </div>
  );
}
