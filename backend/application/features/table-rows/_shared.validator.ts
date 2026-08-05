import z from 'zod';

import { E_REACTION_TYPE, type Merge } from '@application/core/entity.core';
import {
  bulkIds,
  pagination,
  slugIdParams,
} from '@application/features/_shared.validator';

/**
 * Entrada da fatia `table-rows`. Fonte unica — os `*.schema.ts` derivam daqui o
 * JSON Schema da rota com `zodToRouteSchema`.
 *
 * Nove operacoes so apelidavam o `slugIdParams()` do core e seis
 * reescreviam o `:slug` sozinho; o corpo dinamico da row aparecia em quatro
 * copias quase iguais.
 */

/** `:slug` da tabela — rotas que ainda nao apontam uma row. */
export const TableSlugParamsValidator = z.object({
  slug: z.string().trim(),
});

/** `:slug` + `:_id`: tabela + row. Vem do core, reexportado pela fatia. */
export const TableRowParamsValidator = slugIdParams();

export type TableRowShowPayload = z.infer<typeof TableRowParamsValidator>;
export type TableRowDeletePayload = z.infer<typeof TableRowParamsValidator>;
export type TableRowSendToTrashPayload = z.infer<
  typeof TableRowParamsValidator
>;
export type TableRowRemoveFromTrashPayload = z.infer<
  typeof TableRowParamsValidator
>;
export type ImportCsvParams = z.infer<typeof TableSlugParamsValidator>;

export const TableRowShowBySlugParamsValidator = z.object({
  slug: z.string().trim(),
  rowSlug: z.string().trim(),
});

export type TableRowShowBySlugPayload = z.infer<
  typeof TableRowShowBySlugParamsValidator
>;

/**
 * Sinais que o `TableAccessMiddleware` injeta e o Mongoose descarta ao
 * persistir (chaves `__`). Nunca vem do cliente — ver o controller.
 */
type RequesterSignals = {
  __actorUserId?: string;
  /** Convidado contributor: so opera nos proprios registros. */
  __ownOnly?: boolean;
  __isOwner?: boolean;
  __isAdministrator?: boolean;
};

/**
 * Corpo dinamico da row: as chaves sao os slugs dos campos configurados no
 * low-code, entao o formato so pode ser descrito por tipo de valor. A validacao
 * por campo roda no use-case, contra a definicao da tabela.
 */
const TableRowValueValidator = z.union([
  z.string().trim(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string().trim()),
  z.array(z.number()),
  z.array(z.object({ _id: z.string().trim().optional() }).loose()),
  z.object({}).loose(),
]);

export const TableRowBodyValidator = z.record(
  z.string(),
  TableRowValueValidator,
);

export type TableRowCreatePayload = Merge<
  z.infer<typeof TableSlugParamsValidator>,
  z.infer<typeof TableRowBodyValidator>
>;

export type TableRowUpdatePayload = Merge<
  z.infer<typeof TableRowParamsValidator>,
  z.infer<typeof TableRowBodyValidator>
>;

// ── Auto-save ─────────────────────────────────────────────────────────

export const TableRowAutoSaveQueryValidator = z.object({
  _id: z.string().trim().optional(),
});

export const TableRowAutoSaveBodyValidator = TableRowBodyValidator;

export type TableRowAutoSavePayload = Merge<
  z.infer<typeof TableSlugParamsValidator>,
  z.infer<typeof TableRowAutoSaveBodyValidator>
>;

// ── Leitura ───────────────────────────────────────────────────────────

export const TableRowPaginatedQueryValidator = pagination()
  .extend({
    search: z.string().trim().optional(),
    // Filtro excludeLinked: oculta registros ja vinculados (autocomplete 1:1/N:N).
    excludeLinked: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    relationshipId: z.string().trim().optional(),
    excludeSide: z.enum(['source', 'target']).optional(),
    excludeForRecordId: z.string().trim().optional(),
    // Auto-relacionamento: oculta o proprio registro editado da lista de
    // candidatos (so tem efeito quando a tabela-alvo e a propria).
    excludeSelfId: z.string().trim().optional(),
  })
  .loose();

export type TableRowPaginatedPayload = Merge<
  z.infer<typeof TableSlugParamsValidator>,
  z.infer<typeof TableRowPaginatedQueryValidator>
>;

export const TableRowExportCsvQueryValidator = z
  .object({ search: z.string().trim().optional() })
  .loose();

export type TableRowExportCsvPayload = Merge<
  Merge<
    z.infer<typeof TableSlugParamsValidator>,
    z.infer<typeof TableRowExportCsvQueryValidator>
  >,
  { user?: string; isOwner?: boolean; isAdministrator?: boolean }
>;

// ── Operacoes em massa ────────────────────────────────────────────────

export const BulkIdsBodyValidator = z.object({ ids: bulkIds() });

export type BulkTrashPayload = Merge<
  z.infer<typeof TableSlugParamsValidator>,
  z.infer<typeof BulkIdsBodyValidator>
>;
export type BulkRestorePayload = BulkTrashPayload;
export type BulkDeletePayload = BulkTrashPayload;

export const BulkUpdateBodyValidator = z.object({
  ids: bulkIds().max(200),
  data: TableRowBodyValidator.refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  }),
});

export type BulkUpdatePayload = Merge<
  Merge<
    z.infer<typeof TableSlugParamsValidator>,
    z.infer<typeof BulkUpdateBodyValidator>
  >,
  RequesterSignals
>;

// ── Reacao e avaliacao ────────────────────────────────────────────────

export const TableRowReactionBodyValidator = z.object({
  type: z.enum([E_REACTION_TYPE.LIKE, E_REACTION_TYPE.UNLIKE]),
  field: z.string().trim(),
});

export type TableRowReactionPayload = Merge<
  Merge<
    z.infer<typeof TableRowParamsValidator>,
    z.infer<typeof TableRowReactionBodyValidator>
  >,
  { user: string }
>;

export const TableRowEvaluationBodyValidator = z.object({
  value: z.number(),
  field: z.string().trim(),
});

export type TableRowEvaluationPayload = Merge<
  Merge<
    z.infer<typeof TableRowParamsValidator>,
    z.infer<typeof TableRowEvaluationBodyValidator>
  >,
  { user: string }
>;

// ── Forum ─────────────────────────────────────────────────────────────

/** `:slug` + `:_id` + `:messageId` — aponta uma mensagem do forum. */
export const ForumMessageParamsValidator = slugIdParams().extend({
  messageId: z.string().trim(),
});

const ForumMessageBodyValidator = z.object({
  text: z.string().optional(),
  attachments: z.array(z.string().trim()).optional(),
  mentions: z.array(z.string().trim()).optional(),
  replyTo: z.string().trim().nullable().optional(),
});

export const ForumMessageCreateBodyValidator = ForumMessageBodyValidator;
export const ForumMessageUpdateBodyValidator = ForumMessageBodyValidator;

export type ForumMessageCreatePayload = Merge<
  Merge<
    z.infer<typeof TableRowParamsValidator>,
    z.infer<typeof ForumMessageCreateBodyValidator>
  >,
  { user: string }
>;

export type ForumMessageUpdatePayload = Merge<
  Merge<
    z.infer<typeof ForumMessageParamsValidator>,
    z.infer<typeof ForumMessageUpdateBodyValidator>
  >,
  { user: string }
>;

export type ForumMessageDeletePayload = Merge<
  z.infer<typeof ForumMessageParamsValidator>,
  { user: string }
>;

export type ForumMessageMentionReadPayload = ForumMessageDeletePayload;
