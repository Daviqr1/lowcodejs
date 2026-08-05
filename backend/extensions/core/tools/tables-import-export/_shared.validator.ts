import z from 'zod';

/**
 * Entrada da extensao `tables-import-export`. Os dois validators por operacao
 * (`export-table`, `import-table`) viram um `_shared` da extensao.
 */

// ── Exportar ──────────────────────────────────────────────────────────

function slugSchema(): z.ZodString {
  return z.string().trim().min(1, 'Slug inválido');
}

export const ExportTableValidator = z
  .object({
    slug: slugSchema().optional(),
    slugs: z.array(slugSchema()).min(1).optional(),
    exportType: z.enum(['structure', 'data', 'full'], {
      message: 'Tipo de exportacao deve ser: structure, data ou full',
    }),
    acknowledgeMissingRelationships: z.boolean().optional().default(false),
  })
  .refine(
    (value) => Boolean(value.slug) || (value.slugs && value.slugs.length > 0),
    {
      message: 'Informe slug ou slugs',
      path: ['slugs'],
    },
  );

export type ExportTablePayload = z.infer<typeof ExportTableValidator>;

// ── Importar ──────────────────────────────────────────────────────────

export const ImportTableValidator = z.object({
  name: z
    .string()
    .trim()
    .max(40, 'Nome deve ter no maximo 40 caracteres')
    .optional()
    .nullable(),
  /**
   * Renomeação por tabela (`slug` original → novo `name`). O slug final é
   * derivado do nome no backend. Tabelas ausentes mantêm nome/slug originais.
   */
  tables: z
    .array(
      z.object({
        slug: z.string().trim().min(1),
        name: z
          .string()
          .trim()
          .min(1, 'Nome e obrigatorio')
          .max(40, 'Nome deve ter no maximo 40 caracteres'),
      }),
    )
    .optional(),
  /**
   * Renomeação por item de menu (`slug` original → novo `name`). Aplica-se
   * apenas aos itens em conflito; menus-pai já existentes são reaproveitados
   * e nunca são renomeados.
   */
  menus: z
    .array(
      z.object({
        slug: z.string().trim().min(1),
        name: z
          .string()
          .trim()
          .min(1, 'Nome e obrigatorio')
          .max(120, 'Nome deve ter no maximo 120 caracteres'),
      }),
    )
    .optional(),
  /**
   * Correlaciona a importação com o feed de progresso via WebSocket
   * (`/table-import`). Gerado pelo cliente (UUID) e devolvido nos eventos
   * `progress`/`completed`/`error`. Opcional — sem ele a importação roda
   * normalmente, apenas sem emitir progresso.
   */
  jobId: z.string().trim().min(1).max(100).optional(),
  fileContent: z.object({}).loose(),
});

export type ImportTablePayload = z.infer<typeof ImportTableValidator>;
