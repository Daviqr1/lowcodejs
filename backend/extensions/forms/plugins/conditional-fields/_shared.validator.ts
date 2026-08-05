import z from 'zod';

function conditionalFieldRule(): z.ZodObject<
  {
    id: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
    sourceFieldId: z.ZodString;
    sourceFieldSlug: z.ZodString;
    sourceValue: z.ZodString;
    showFieldIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
    hideFieldIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
> {
  return z.object({
    id: z.string().trim().min(1),
    label: z.string().trim().optional(),
    sourceFieldId: z.string().trim().min(1),
    sourceFieldSlug: z.string().trim().min(1),
    sourceValue: z.string().trim().min(1),
    showFieldIds: z.array(z.string().trim().min(1)).default([]),
    hideFieldIds: z.array(z.string().trim().min(1)).default([]),
  });
}

export const ConditionalFieldRuleValidator = conditionalFieldRule();

export const UpdateConditionalFieldsConfigValidator = z.object({
  rules: z.array(conditionalFieldRule()).default([]),
});

export type UpdateConditionalFieldsConfigInput = z.infer<
  typeof UpdateConditionalFieldsConfigValidator
>;
