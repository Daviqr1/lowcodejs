import z from 'zod';

export const ConditionalFieldRuleValidator = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().optional(),
  sourceFieldId: z.string().trim().min(1),
  sourceFieldSlug: z.string().trim().min(1),
  sourceValue: z.string().trim().min(1),
  showFieldIds: z.array(z.string().trim().min(1)).default([]),
  hideFieldIds: z.array(z.string().trim().min(1)).default([]),
});

export const UpdateConditionalFieldsConfigValidator = z.object({
  rules: z.array(ConditionalFieldRuleValidator).default([]),
});

export type UpdateConditionalFieldsConfigInput = z.infer<
  typeof UpdateConditionalFieldsConfigValidator
>;
