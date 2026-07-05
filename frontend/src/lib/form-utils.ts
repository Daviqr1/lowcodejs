import type { AnyFieldMetaBase, AnyFormApi } from '@tanstack/form-core';

export const SERVER_ERROR_KEY = 'onServer' as const;

type FieldMetaLike = {
  isTouched?: boolean;
  isValid?: boolean;
  errorMap?: AnyFieldMetaBase['errorMap'];
};

export function getFieldInvalidState(meta: FieldMetaLike): boolean {
  const hasServerError = Boolean(meta.errorMap?.[SERVER_ERROR_KEY]);
  if (hasServerError) return true;
  return Boolean(meta.isTouched) && !meta.isValid;
}

/**
 * Aplica erros vindos da API a campos do form via slot `onServer` do errorMap.
 * Os erros são limpos automaticamente assim que o usuário altera qualquer
 * campo, desde que o form esteja conectado ao hook `useApiErrorAutoClear`.
 */
export function applyApiFieldErrors(
  form: AnyFormApi,
  errors: Record<string, string>,
): void {
  for (const [name, message] of Object.entries(errors)) {
    form.setFieldMeta(name, (prev: AnyFieldMetaBase) => ({
      ...prev,
      errorMap: { ...prev.errorMap, [SERVER_ERROR_KEY]: { message } },
    }));
  }
}

/**
 * Remove o slot `onServer` do errorMap em todos os campos do form.
 * Idempotente — campos sem o slot não são tocados.
 */
export function clearApiFieldErrors(form: AnyFormApi): void {
  const fieldMeta = form.state.fieldMeta;
  for (const name of Object.keys(fieldMeta)) {
    const meta = fieldMeta[name];
    if (!meta?.errorMap?.[SERVER_ERROR_KEY]) continue;

    form.setFieldMeta(name, (prev: AnyFieldMetaBase) => {
      if (!prev.errorMap?.[SERVER_ERROR_KEY]) return prev;
      const nextErrorMap = { ...prev.errorMap };
      delete nextErrorMap[SERVER_ERROR_KEY];
      return { ...prev, errorMap: nextErrorMap };
    });
  }
}
