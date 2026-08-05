import z from 'zod';

export const CloneTableValidator = z
  .object({
    baseTableId: z.string().trim().optional(),
    baseTableIds: z.array(z.string().trim().min(1)).min(1).optional(),
    copyDataTableIds: z.array(z.string().trim().min(1)).optional().default([]),
    name: z
      .string()
      .trim()
      .max(40, 'Nome deve ter no máximo 40 caracteres')
      .refine(
        (value) =>
          value === '' ||
          /^[a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s\-_]+$/.test(value),
        'Nome pode conter apenas letras, números, espaços, hífen, underscore e ç',
      )
      .optional()
      .default(''),
  })
  .refine((payload) => payload.baseTableId || payload.baseTableIds?.length, {
    message: 'Selecione ao menos uma tabela base',
    path: ['baseTableIds'],
  });

export type CloneTablePayload = z.infer<typeof CloneTableValidator>;
