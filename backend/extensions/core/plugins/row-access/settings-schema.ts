import { z } from 'zod';

/**
 * Row Access Control — settings schema (v3, group-keyed)
 *
 * Substitui o roleMatrix (Record<value, E_ROLE[]>) por groupMatrix
 * (Record<value, string[]>) onde string[] = ids de grupo.
 *
 * Anti-lockout: NÃO é imposto pelo schema (ids de grupo são por-instância
 * e não são conhecidos em tempo de schema). O bypass de privilegiado no
 * RowAccessGuardService garante que MASTER/ADMINISTRATOR nunca ficam trancados.
 *
 * Invariantes (validados pelo Zod e pelo guard.onTableBound):
 *  - visibility.values: 2..8 valores únicos, UPPER_SNAKE_CASE
 *  - visibility.defaultValue: pertence a visibility.values
 *  - visibility.groupMatrix: cobre todos os valores de visibility.values
 *  - dateWindow.mode='off' significa "não filtrar"
 */

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
    /**
     * Mapa valor -> ids de grupos que podem ver rows com esse valor.
     * String[] = ids de grupo (por-instância). Vazio = nenhum grupo vê.
     */
    groupMatrix: z.record(visibilityValueSchema, z.array(z.string())),
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

    // groupMatrix cobre todos os valores
    for (const value of data.values) {
      if (!(value in data.groupMatrix)) {
        ctx.addIssue({
          code: 'custom',
          path: ['groupMatrix', value],
          message: `Valor '${value}' nao tem grupos configurados no groupMatrix`,
        });
      }
    }

    // groupMatrix nao tem keys orfas
    for (const key of Object.keys(data.groupMatrix)) {
      if (!data.values.includes(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['groupMatrix', key],
          message: `Chave '${key}' nao esta em values`,
        });
      }
    }
  });

const creatorBypassSettingsSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Visibilidade por campo USER_GROUP: `fieldSlug` aponta para um campo do tipo
 * USER_GROUP da tabela. A row é visível/editável apenas se algum grupo do
 * usuário (fecho `ctx.groupIds`) estiver entre os grupos gravados no campo.
 * Convive com `visibility` (groupMatrix) por AND. Slug de campo segue o padrão
 * do FieldSlug (`^[a-z0-9]+(-[a-z0-9]+)*$`) — pode conter hifens.
 */
const FIELD_SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const fieldVisibilitySettingsSchema = z
  .object({
    enabled: z.boolean(),
    fieldSlug: z.string().default(''),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;
    if (!FIELD_SLUG_REGEX.test(data.fieldSlug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['fieldSlug'],
        message: 'Slug do campo de grupos invalido',
      });
    }
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
  // Retrocompat: settings persistidos antes desta feature não têm a chave.
  // Default desabilitado mantém o comportamento anterior sem migration.
  fieldVisibility: fieldVisibilitySettingsSchema
    .optional()
    .default({ enabled: false, fieldSlug: '' }),
  creatorBypass: creatorBypassSettingsSchema,
  dateWindow: dateWindowSettingsSchema,
});

export type RowAccessSettings = z.infer<typeof rowAccessSettingsSchema>;
export type DateWindowSettings = z.infer<typeof dateWindowSettingsSchema>;
export type VisibilitySettings = z.infer<typeof visibilitySettingsSchema>;
export type FieldVisibilitySettings = z.infer<
  typeof fieldVisibilitySettingsSchema
>;

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_VISIBILITY_VALUES = [
  'PUBLIC',
  'INTERNO',
  'RESTRITO',
  'SIGILOSO',
] as const;

/**
 * groupMatrix padrão usa strings placeholder (IDs que não existem de facto).
 * Na prática, o operador configura com os IDs reais dos grupos ao ativar.
 * O bypass de privilegiado (isPrivileged) garante que MASTER/ADMIN acessam
 * independentemente do groupMatrix.
 *
 * NOTA: este default é usado apenas em testes e como fallback de parsing.
 * Em produção, o operador DEVE configurar IDs reais via configure-table-scope.
 */
export const DEFAULT_GROUP_MATRIX: Record<string, string[]> = {
  PUBLIC: [],
  INTERNO: [],
  RESTRITO: [],
  SIGILOSO: [],
};

export const DEFAULT_ROW_ACCESS_SETTINGS: RowAccessSettings = {
  visibility: {
    enabled: true,
    fieldSlug: 'visibility',
    values: [...DEFAULT_VISIBILITY_VALUES],
    groupMatrix: DEFAULT_GROUP_MATRIX,
    defaultValue: 'PUBLIC',
  },
  fieldVisibility: { enabled: false, fieldSlug: '' },
  creatorBypass: { enabled: true },
  dateWindow: { mode: 'off' },
};
