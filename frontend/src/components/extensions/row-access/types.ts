/**
 * Tipos compartilhados pelo sheet de Row Access Control (v3 — group-keyed).
 * Espelha o contrato do backend: groupMatrix em vez de roleMatrix.
 */

export type DateWindowMode =
  | 'off'
  | 'createdAt-sliding'
  | 'createdAt-fixed'
  | 'field-range';

export type DateWindowSettings =
  | { mode: 'off' }
  | { mode: 'createdAt-sliding'; slidingDays: number }
  | {
      mode: 'createdAt-fixed';
      fixedFrom: string | null;
      fixedTo: string | null;
    }
  | { mode: 'field-range'; validFromSlug: string; validUntilSlug: string };

export type VisibilitySettings = {
  enabled: boolean;
  fieldSlug: string;
  values: Array<string>;
  /** value → groupIds que podem ver aquele valor */
  groupMatrix: Record<string, Array<string>>;
  defaultValue: string;
};

/**
 * Visibilidade por campo USER_GROUP da propria row: a row so aparece se algum
 * grupo do usuario estiver entre os gravados no campo. Combina com
 * `visibility` por AND.
 */
export type FieldVisibilitySettings = {
  enabled: boolean;
  fieldSlug: string;
};

export type RowAccessSettings = {
  visibility: VisibilitySettings;
  fieldVisibility: FieldVisibilitySettings;
  creatorBypass: { enabled: boolean };
  dateWindow: DateWindowSettings;
};

export const DEFAULT_VISIBILITY_VALUES = [
  'PUBLIC',
  'INTERNO',
  'RESTRITO',
  'SIGILOSO',
] as const;

/**
 * A matriz nasce com uma chave por valor (lista vazia = nenhum grupo ve aquele
 * valor). O schema do backend rejeita valor sem chave, entao `{}` faria toda
 * configuracao nova falhar na validacao.
 */
export const DEFAULT_ROW_ACCESS_SETTINGS: RowAccessSettings = {
  visibility: {
    enabled: true,
    fieldSlug: 'visibility',
    values: [...DEFAULT_VISIBILITY_VALUES],
    groupMatrix: Object.fromEntries(
      DEFAULT_VISIBILITY_VALUES.map((value) => [value, []]),
    ),
    defaultValue: 'PUBLIC',
  },
  fieldVisibility: { enabled: false, fieldSlug: '' },
  creatorBypass: { enabled: true },
  dateWindow: { mode: 'off' },
};

/**
 * Garante que `groupMatrix` cobre exatamente `values`: o `superRefine` do
 * backend recusa tanto valor sem chave quanto chave orfa.
 */
export function normalizeSettings(
  settings: RowAccessSettings,
): RowAccessSettings {
  const groupMatrix: Record<string, Array<string>> = {};
  for (const value of settings.visibility.values) {
    groupMatrix[value] = settings.visibility.groupMatrix[value] ?? [];
  }

  return {
    ...settings,
    visibility: { ...settings.visibility, groupMatrix },
  };
}

export const VISIBILITY_VALUE_REGEX = /^[A-Z][A-Z0-9_]*$/;
/** Mesmo pattern de slug de campo da plataforma (`core/field-slug.core.ts`). */
export const FIELD_SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_VISIBILITY_VALUES = 8;

export function isRowAccessSettings(
  raw: Record<string, unknown> | undefined,
): raw is RowAccessSettings {
  return (
    !!raw &&
    typeof raw === 'object' &&
    'visibility' in raw &&
    'creatorBypass' in raw &&
    'dateWindow' in raw
  );
}
