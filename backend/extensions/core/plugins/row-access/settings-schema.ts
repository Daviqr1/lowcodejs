import { z } from 'zod';

/**
 * Row Access Control — settings schema
 *
 * Plugin unico que aplica visibility por papel + creator bypass + janela
 * temporal. Cada bloco pode estar habilitado/desabilitado individualmente.
 *
 * Invariantes (validados pelo Zod e pelo guard.onTableBound):
 *  - visibility.values: 2..8 valores unicos, slug-safe (uppercase, alphanum, _)
 *  - visibility.defaultValue: pertence a visibility.values
 *  - visibility.roleMatrix: para CADA valor, MASTER e ADMINISTRATOR sempre
 *    presentes (impede lockout)
 *  - dateWindow.mode='off' significa "nao filtrar"
 */

export const ROW_ACCESS_ROLES = [
  'MASTER',
  'ADMINISTRATOR',
  'MANAGER',
  'REGISTERED',
] as const;

export type RowAccessRole = (typeof ROW_ACCESS_ROLES)[number];

const roleSchema = z.enum(ROW_ACCESS_ROLES);

const visibilityValueSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Z][A-Z0-9_]*$/, 'Valor deve ser UPPER_SNAKE_CASE');

const fieldSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z][a-z0-9_]*$/, 'Slug deve ser lower_snake_case');

const visibilitySettingsSchema = z
  .object({
    enabled: z.boolean(),
    fieldSlug: fieldSlugSchema.default('visibility'),
    values: z.array(visibilityValueSchema).min(2).max(8),
    roleMatrix: z.record(visibilityValueSchema, z.array(roleSchema)),
    defaultValue: visibilityValueSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;

    // sem duplicatas
    const seen = new Set<string>();
    for (const v of data.values) {
      if (seen.has(v)) {
        ctx.addIssue({
          code: 'custom',
          path: ['values'],
          message: `Valor duplicado: ${v}`,
        });
      }
      seen.add(v);
    }

    // defaultValue pertence a values
    if (!data.values.includes(data.defaultValue)) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultValue'],
        message: `'${data.defaultValue}' nao esta em values`,
      });
    }

    // roleMatrix cobre todos os valores E garante MASTER+ADMINISTRATOR
    for (const value of data.values) {
      const roles = data.roleMatrix[value];
      if (!roles) {
        ctx.addIssue({
          code: 'custom',
          path: ['roleMatrix', value],
          message: `Valor '${value}' nao tem roles configurados`,
        });
        continue;
      }
      if (!roles.includes('MASTER') || !roles.includes('ADMINISTRATOR')) {
        ctx.addIssue({
          code: 'custom',
          path: ['roleMatrix', value],
          message: `MASTER e ADMINISTRATOR devem sempre estar presentes em '${value}'`,
        });
      }
    }

    // roleMatrix nao tem keys orfas
    for (const key of Object.keys(data.roleMatrix)) {
      if (!data.values.includes(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['roleMatrix', key],
          message: `Chave '${key}' nao esta em values`,
        });
      }
    }
  });

const creatorBypassSettingsSchema = z.object({
  enabled: z.boolean(),
});

export const dateWindowSettingsSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('off') }),
  z.object({
    mode: z.literal('createdAt-sliding'),
    slidingDays: z.number().int().positive().max(3650),
  }),
  z.object({
    mode: z.literal('createdAt-fixed'),
    fixedFrom: z.string().datetime().nullable(),
    fixedTo: z.string().datetime().nullable(),
  }),
  z.object({
    mode: z.literal('field-range'),
    validFromSlug: fieldSlugSchema,
    validUntilSlug: fieldSlugSchema,
  }),
]);

export const rowAccessSettingsSchema = z.object({
  visibility: visibilitySettingsSchema,
  creatorBypass: creatorBypassSettingsSchema,
  dateWindow: dateWindowSettingsSchema,
});

export type RowAccessSettings = z.infer<typeof rowAccessSettingsSchema>;
export type DateWindowSettings = z.infer<typeof dateWindowSettingsSchema>;
export type VisibilitySettings = z.infer<typeof visibilitySettingsSchema>;

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_VISIBILITY_VALUES = [
  'PUBLIC',
  'INTERNO',
  'RESTRITO',
  'SIGILOSO',
] as const;

export const DEFAULT_ROLE_MATRIX: Record<string, RowAccessRole[]> = {
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
    roleMatrix: DEFAULT_ROLE_MATRIX,
    defaultValue: 'PUBLIC',
  },
  creatorBypass: { enabled: true },
  dateWindow: { mode: 'off' },
};
