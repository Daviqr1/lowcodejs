/**
 * Tipos compartilhados pelo sheet de Row Access Control.
 * Espelham backend/extensions/core/plugins/row-access/settings-schema.ts.
 */
export const ROW_ACCESS_ROLES = [
  'MASTER',
  'ADMINISTRATOR',
  'MANAGER',
  'REGISTERED',
] as const;

export type RowAccessRole = (typeof ROW_ACCESS_ROLES)[number];

export const ROLE_LABEL: Record<RowAccessRole, string> = {
  MASTER: 'Master',
  ADMINISTRATOR: 'Administrador',
  MANAGER: 'Gerente',
  REGISTERED: 'Registrado',
};

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
  roleMatrix: Record<string, Array<RowAccessRole>>;
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

export const DEFAULT_ROLE_MATRIX: Record<string, Array<RowAccessRole>> = {
  PUBLIC: ['MASTER', 'ADMINISTRATOR', 'MANAGER', 'REGISTERED'],
  INTERNO: ['MASTER', 'ADMINISTRATOR', 'MANAGER'],
  RESTRITO: ['MASTER', 'ADMINISTRATOR', 'MANAGER'],
  SIGILOSO: ['MASTER', 'ADMINISTRATOR'],
};

export const DEFAULT_ROW_ACCESS_SETTINGS: RowAccessSettings = {
  visibility: {
    enabled: true,
    fieldSlug: 'visibility',
    values: [...DEFAULT_VISIBILITY_VALUES],
    roleMatrix: { ...DEFAULT_ROLE_MATRIX },
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
