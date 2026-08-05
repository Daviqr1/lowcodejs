import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-_]*$/;

function responseField(): z.ZodObject<
  {
    key: z.ZodString;
    label: z.ZodString;
    type: z.ZodEnum<{
      string: 'string';
      number: 'number';
      boolean: 'boolean';
      date: 'date';
    }>;
  },
  z.core.$strip
> {
  return z.object({
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
}

export const ResponseFieldSchema = responseField();

function documentType(): z.ZodObject<
  {
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responseFields: z.ZodArray<
      z.ZodObject<
        {
          key: z.ZodString;
          label: z.ZodString;
          type: z.ZodEnum<{
            string: 'string';
            number: 'number';
            boolean: 'boolean';
            date: 'date';
          }>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
> {
  return z.object({
    id: z.string().min(1).regex(SLUG_REGEX, 'ID deve ser slug'),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    responseFields: z
      .array(responseField())
      .min(1, 'Informe ao menos um campo de resposta'),
  });
}

export const DocumentTypeSchema = documentType();

export const UpdateConfigValidator = z.object({
  apiUrl: z.string().url('URL inválida').nullable().optional(),
  apiKey: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  documentTypes: z.array(documentType()).optional(),
});

export type UpdateConfigInput = z.infer<typeof UpdateConfigValidator>;

export const TranscribeValidator = z.object({
  documentTypeId: z.string().min(1),
});

export type TranscribeInput = z.infer<typeof TranscribeValidator>;
