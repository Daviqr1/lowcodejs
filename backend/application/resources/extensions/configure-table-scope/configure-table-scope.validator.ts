import { z } from 'zod';

export const ExtensionConfigureTableScopeParamsValidator = z
  .object({
    _id: z.string().min(1),
  })
  .strict();

export type ExtensionConfigureTableScopeParamsInput = z.infer<
  typeof ExtensionConfigureTableScopeParamsValidator
>;

export const ExtensionConfigureTableScopeBodyValidator = z
  .object({
    mode: z.enum(['all', 'specific']),
    tableIds: z.array(z.string().min(1)).default([]),
  })
  .strict()
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
