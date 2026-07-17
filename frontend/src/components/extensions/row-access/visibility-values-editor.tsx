import { XIcon } from 'lucide-react';
import React from 'react';

import { MAX_VISIBILITY_VALUES, VISIBILITY_VALUE_REGEX } from './types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Props = {
  values: Array<string>;
  /** groupMatrix acompanha values — ao remover um valor, remove a key da matriz */
  matrix: Record<string, Array<string>>;
  onChange: (
    values: Array<string>,
    matrix: Record<string, Array<string>>,
  ) => void;
  disabled?: boolean;
};

export function VisibilityValuesEditor({
  values,
  matrix,
  onChange,
  disabled,
}: Props): React.JSX.Element {
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  function add(): void {
    const v = draft.trim().toUpperCase();
    if (!v) return;
    if (!VISIBILITY_VALUE_REGEX.test(v)) {
      setError(
        'Use apenas letras maiúsculas, números e underscore (UPPER_SNAKE_CASE).',
      );
      return;
    }
    if (values.includes(v)) {
      setError(`'${v}' já está na lista.`);
      return;
    }
    if (values.length >= MAX_VISIBILITY_VALUES) {
      setError(`Máximo de ${MAX_VISIBILITY_VALUES} valores.`);
      return;
    }
    const nextValues = [...values, v];
    // Novo valor entra com array vazio — o usuário marca grupos na GroupMatrix
    const nextMatrix = { ...matrix, [v]: [] };
    onChange(nextValues, nextMatrix);
    setDraft('');
    setError(null);
  }

  function remove(value: string): void {
    if (values.length <= 2) {
      setError('Mínimo de 2 valores.');
      return;
    }
    const nextValues = values.filter((v) => v !== value);
    const nextMatrix = { ...matrix };
    delete nextMatrix[value];
    onChange(nextValues, nextMatrix);
    setError(null);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  }

  return (
    <Field>
      <FieldLabel>
        Valores disponíveis (campo &quot;visibility&quot;)
      </FieldLabel>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge
            key={value}
            variant="secondary"
            className="gap-1 px-2 py-1 font-mono text-xs"
          >
            {value}
            <button
              type="button"
              disabled={disabled || values.length <= 2}
              onClick={() => remove(value)}
              className="ml-1 inline-flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`Remover ${value}`}
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKey}
          disabled={disabled || values.length >= MAX_VISIBILITY_VALUES}
          placeholder="Ex.: CONFIDENCIAL"
          aria-label="Novo valor de visibilidade"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={add}
          disabled={
            disabled || !draft.trim() || values.length >= MAX_VISIBILITY_VALUES
          }
        >
          Adicionar
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
      <p className="mt-1 text-xs text-muted-foreground">
        2 a {MAX_VISIBILITY_VALUES} valores. UPPER_SNAKE_CASE.
      </p>
    </Field>
  );
}
