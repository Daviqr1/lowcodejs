import React from 'react';

import type { SettingsFormProps } from './settings-form-registry';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useExtensionConfigureTableSettings } from '@/hooks/tanstack-query/use-extension-configure-table-settings';
import { handleApiError } from '@/lib/handle-api-error';
import { toastSuccess } from '@/lib/toast';

type DateWindowMode = 'createdAt-sliding' | 'createdAt-fixed' | 'field-range';

interface FormState {
  mode: DateWindowMode;
  slidingDays: string;
  fixedFrom: string;
  fixedTo: string;
  validFromSlug: string;
  validUntilSlug: string;
}

const SLUG_REGEX = /^[a-z][a-z0-9_]*$/;

function resolveInitialMode(
  initialSettings: Record<string, unknown>,
): DateWindowMode {
  const mode = initialSettings['mode'];
  if (
    mode === 'createdAt-sliding' ||
    mode === 'createdAt-fixed' ||
    mode === 'field-range'
  ) {
    return mode;
  }
  return 'createdAt-sliding';
}

function buildSettings(state: FormState): Record<string, unknown> {
  if (state.mode === 'createdAt-sliding') {
    return {
      mode: state.mode,
      slidingDays: Number(state.slidingDays),
    };
  }
  if (state.mode === 'createdAt-fixed') {
    return {
      mode: state.mode,
      fixedFrom: state.fixedFrom || null,
      fixedTo: state.fixedTo || null,
    };
  }
  return {
    mode: state.mode,
    validFromSlug: state.validFromSlug || null,
    validUntilSlug: state.validUntilSlug || null,
  };
}

function validate(state: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (state.mode === 'createdAt-sliding') {
    const days = Number(state.slidingDays);
    if (!state.slidingDays || isNaN(days) || days < 1 || days > 3650) {
      errors['slidingDays'] = 'Informe um número entre 1 e 3650.';
    }
  }

  if (state.mode === 'field-range') {
    if (state.validFromSlug && !SLUG_REGEX.test(state.validFromSlug)) {
      errors['validFromSlug'] =
        'Slug inválido. Use apenas letras minúsculas, números e underscores, começando com letra.';
    }
    if (state.validUntilSlug && !SLUG_REGEX.test(state.validUntilSlug)) {
      errors['validUntilSlug'] =
        'Slug inválido. Use apenas letras minúsculas, números e underscores, começando com letra.';
    }
  }

  return errors;
}

export function DateWindowSettingsForm({
  extensionId,
  tableId,
  initialSettings,
  expectedUpdatedAt,
  onSuccess,
}: SettingsFormProps): React.JSX.Element {
  const [state, setState] = React.useState<FormState>(() => ({
    mode: resolveInitialMode(initialSettings),
    slidingDays: String(initialSettings['slidingDays'] ?? '30'),
    fixedFrom: String(initialSettings['fixedFrom'] ?? ''),
    fixedTo: String(initialSettings['fixedTo'] ?? ''),
    validFromSlug: String(initialSettings['validFromSlug'] ?? ''),
    validUntilSlug: String(initialSettings['validUntilSlug'] ?? ''),
  }));

  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  const errors = React.useMemo(() => validate(state), [state]);

  const configure = useExtensionConfigureTableSettings({
    onSuccess() {
      toastSuccess('Configurações salvas', 'O guard foi reconfigurado.');
      setConflictError(null);
      onSuccess?.();
    },
    onError(error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 409) {
        setConflictError(
          'A configuração foi modificada por outro usuário. Recarregue a página e tente novamente.',
        );
        return;
      }
      handleApiError(error, { context: 'Erro ao salvar configurações' });
    },
  });

  const isPending = configure.status === 'pending';

  function handleSetMode(mode: DateWindowMode): void {
    setState((prev) => ({ ...prev, mode }));
    setConflictError(null);
  }

  function handleChange(field: keyof FormState, value: string): void {
    setState((prev) => ({ ...prev, [field]: value }));
    setConflictError(null);
  }

  function handleBlur(field: string): void {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setTouched({
      slidingDays: true,
      validFromSlug: true,
      validUntilSlug: true,
    });
    if (Object.keys(errors).length > 0) return;
    configure.mutate({
      extensionId,
      tableId,
      settings: buildSettings(state),
      expectedUpdatedAt,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <Field>
        <FieldLabel>Modo de janela</FieldLabel>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              checked={state.mode === 'createdAt-sliding'}
              onChange={() => handleSetMode('createdAt-sliding')}
              disabled={isPending}
            />
            <span>Janela deslizante (N dias anteriores)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              checked={state.mode === 'createdAt-fixed'}
              onChange={() => handleSetMode('createdAt-fixed')}
              disabled={isPending}
            />
            <span>Intervalo fixo de datas</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              checked={state.mode === 'field-range'}
              onChange={() => handleSetMode('field-range')}
              disabled={isPending}
            />
            <span>Campos de data no registro</span>
          </label>
        </div>
      </Field>

      {state.mode === 'createdAt-sliding' && (
        <Field>
          <FieldLabel htmlFor={`${tableId}-sliding-days`}>
            Últimos N dias
          </FieldLabel>
          <Input
            id={`${tableId}-sliding-days`}
            type="number"
            min={1}
            max={3650}
            value={state.slidingDays}
            onChange={(e) => handleChange('slidingDays', e.target.value)}
            onBlur={() => handleBlur('slidingDays')}
            disabled={isPending}
            placeholder="Ex.: 30"
            aria-invalid={
              touched['slidingDays'] && Boolean(errors['slidingDays'])
            }
          />
          {touched['slidingDays'] && errors['slidingDays'] && (
            <FieldError>{errors['slidingDays']}</FieldError>
          )}
        </Field>
      )}

      {state.mode === 'createdAt-fixed' && (
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor={`${tableId}-fixed-from`}>De</FieldLabel>
            <Input
              id={`${tableId}-fixed-from`}
              type="date"
              value={state.fixedFrom}
              onChange={(e) => handleChange('fixedFrom', e.target.value)}
              disabled={isPending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${tableId}-fixed-to`}>Até</FieldLabel>
            <Input
              id={`${tableId}-fixed-to`}
              type="date"
              value={state.fixedTo}
              onChange={(e) => handleChange('fixedTo', e.target.value)}
              disabled={isPending}
            />
          </Field>
        </div>
      )}

      {state.mode === 'field-range' && (
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor={`${tableId}-from-slug`}>
              Slug do campo &lsquo;Válido a partir&rsquo;
            </FieldLabel>
            <Input
              id={`${tableId}-from-slug`}
              type="text"
              value={state.validFromSlug}
              onChange={(e) => handleChange('validFromSlug', e.target.value)}
              onBlur={() => handleBlur('validFromSlug')}
              disabled={isPending}
              placeholder="Ex.: valido_a_partir"
              aria-invalid={
                touched['validFromSlug'] && Boolean(errors['validFromSlug'])
              }
            />
            {touched['validFromSlug'] && errors['validFromSlug'] && (
              <FieldError>{errors['validFromSlug']}</FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${tableId}-until-slug`}>
              Slug do campo &lsquo;Válido até&rsquo;
            </FieldLabel>
            <Input
              id={`${tableId}-until-slug`}
              type="text"
              value={state.validUntilSlug}
              onChange={(e) => handleChange('validUntilSlug', e.target.value)}
              onBlur={() => handleBlur('validUntilSlug')}
              disabled={isPending}
              placeholder="Ex.: valido_ate"
              aria-invalid={
                touched['validUntilSlug'] && Boolean(errors['validUntilSlug'])
              }
            />
            {touched['validUntilSlug'] && errors['validUntilSlug'] && (
              <FieldError>{errors['validUntilSlug']}</FieldError>
            )}
          </Field>
          <p className="text-xs text-muted-foreground">
            Os campos de data serão criados automaticamente na tabela se ainda
            não existirem.
          </p>
        </div>
      )}

      {conflictError && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {conflictError}
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={isPending}
      >
        {isPending && <Spinner />}
        Salvar configurações
      </Button>
    </form>
  );
}
