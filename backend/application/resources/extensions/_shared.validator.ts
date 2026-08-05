import { z } from 'zod';

/**
 * Entrada da fatia `extensions`. Fonte unica — os `*.schema.ts` derivam daqui
 * o JSON Schema da rota com `zodToRouteSchema`.
 */

/** `:_id` da extensao. Antes declarado identico em 3 operacoes. */
export const ExtensionIdentifierParamsValidator = z
  .object({ _id: z.string().min(1) })
  .strict();

export type ExtensionIdentifierParams = z.infer<
  typeof ExtensionIdentifierParamsValidator
>;

export const ExtensionToggleBodyValidator = z
  .object({ enabled: z.boolean() })
  .strict();

export type ExtensionToggleBodyInput = z.infer<
  typeof ExtensionToggleBodyValidator
>;

export const ExtensionConfigureTableScopeBodyValidator = z
  .object({
    mode: z.enum(['all', 'specific']),
    tableIds: z.array(z.string().min(1)).default([]),
  })
  .strict()
  // Regra cruzada: `.refine()` nao vai para o JSON Schema, so o `.parse()` a garante.
  .refine(
    (data) =>
      data.mode === 'all' ||
      (data.mode === 'specific' && data.tableIds.length > 0),
    {
      message:
        'Quando o modo é "specific", informe ao menos uma tabela em tableIds',
      path: ['tableIds'],
    },
  );

export type ExtensionConfigureTableScopeBodyInput = z.infer<
  typeof ExtensionConfigureTableScopeBodyValidator
>;

export const BulkConfigureTableSettingsBodyValidator = z
  .object({
    /**
     * Mapa de tableId -> settings a persistir em lote.
     * As settings sao validadas individualmente pelo guard antes de persistir.
     */
    tableSettings: z.record(
      z.string().min(1),
      z.record(z.string(), z.unknown()),
    ),
  })
  .strict();

export type BulkConfigureTableSettingsBodyInput = z.infer<
  typeof BulkConfigureTableSettingsBodyValidator
>;
