import z from 'zod';

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
