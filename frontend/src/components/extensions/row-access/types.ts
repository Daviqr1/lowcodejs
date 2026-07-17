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

export type RowAccessSettings = {
  visibility: VisibilitySettings;
  creatorBypass: { enabled: boolean };
  dateWindow: DateWindowSettings;
};

export const DEFAULT_VISIBILITY_VALUES = [
  'PUBLIC',
  'INTERNO',
  'RESTRITO',
  'SIGILOSO',
] as const;

/** Defaults sem groupMatrix — grupos preenchidos em runtime após carregar grupos */
export const DEFAULT_ROW_ACCESS_SETTINGS: RowAccessSettings = {
  visibility: {
    enabled: true,
    fieldSlug: 'visibility',
    values: [...DEFAULT_VISIBILITY_VALUES],
    groupMatrix: {},
    defaultValue: 'PUBLIC',
  },
  creatorBypass: { enabled: true },
  dateWindow: { mode: 'off' },
};

export const VISIBILITY_VALUE_REGEX = /^[A-Z][A-Z0-9_]*$/;
export const FIELD_SLUG_REGEX = /^[a-z][a-z0-9_]*$/;
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
