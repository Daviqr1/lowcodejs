import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-_]*$/;

export const ResponseFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(
      SLUG_REGEX,
      'Chave deve ser slug (letras minúsculas, números e hífens)',
    ),
  label: z.string().min(1),
  type: z.enum(['string', 'date', 'number', 'boolean']),
});

export const DocumentTypeSchema = z.object({
  id: z.string().min(1).regex(SLUG_REGEX, 'ID deve ser slug'),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  responseFields: z
    .array(ResponseFieldSchema)
    .min(1, 'Informe ao menos um campo de resposta'),
});

export const UpdateConfigValidator = z.object({
  apiUrl: z.string().url('URL inválida').nullable().optional(),
  apiKey: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  documentTypes: z.array(DocumentTypeSchema).optional(),
});

export type UpdateConfigInput = z.infer<typeof UpdateConfigValidator>;

export const TranscribeValidator = z.object({
  documentTypeId: z.string().min(1),
});

export type TranscribeInput = z.infer<typeof TranscribeValidator>;
