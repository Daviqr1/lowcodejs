import z from 'zod';

import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
} from '@application/core/entity.core';

const FIELD_FORMAT_KEY_TO_VALUE: Record<string, string> = E_FIELD_FORMAT;

const FieldFormatSchema = z
  .union([z.string(), z.null()])
  .nullable()
  .optional()
  .default(null)
  .transform((value) => {
    if (value === null || value === undefined) return null;
    // aceita "DD_MM_YYYY" (chave) ou "dd/MM/yyyy" (valor)
    if (value in FIELD_FORMAT_KEY_TO_VALUE) {
      return FIELD_FORMAT_KEY_TO_VALUE[value];
    }
    return value;
  })
  .pipe(z.enum(E_FIELD_FORMAT).nullable());

const IMPORTABLE_FIELD_TYPES = [
  E_FIELD_TYPE.TEXT_SHORT,
  E_FIELD_TYPE.TEXT_LONG,
  E_FIELD_TYPE.DATE,
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.FILE,
  E_FIELD_TYPE.USER,
  E_FIELD_TYPE.CATEGORY,
  E_FIELD_TYPE.RELATIONSHIP,
] as const;

const DropdownOptionSchema = z.object({
  label: z.string().trim().min(1),
  color: z.string().trim().nullable().optional(),
});

const RelationshipReferenceSchema = z.object({
  table: z.string().trim().min(1),
  field: z.string().trim().min(1),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

const SchemaImportFieldSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome do campo é obrigatório')
    .max(60, 'Nome do campo deve ter no máximo 60 caracteres'),
  type: z.enum(IMPORTABLE_FIELD_TYPES),
  required: z.boolean().optional().default(false),
  multiple: z.boolean().optional().default(false),
  format: FieldFormatSchema,
  showInList: z.boolean().optional().default(true),
  showInForm: z.boolean().optional().default(true),
  showInFilter: z.boolean().optional().default(false),
  showInDetail: z.boolean().optional().default(true),
  defaultValue: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional()
    .default(null),
  options: z.array(DropdownOptionSchema).optional().default([]),
  relationship: RelationshipReferenceSchema.nullable().optional().default(null),
});

const SchemaImportTableSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome da tabela é obrigatório')
    .max(40, 'Nome da tabela deve ter no máximo 40 caracteres'),
  style: z.enum(E_TABLE_STYLE).optional(),
  fields: z
    .array(SchemaImportFieldSchema)
    .min(1, 'A tabela precisa de ao menos 1 campo')
    .max(100, 'Limite de 100 campos por tabela'),
});

export const SchemaImportPayloadValidator = z.object({
  tables: z
    .array(SchemaImportTableSchema)
    .min(1, 'É preciso declarar ao menos 1 tabela')
    .max(100, 'Limite de 100 tabelas por importação'),
});

export const SchemaImportBodyValidator = z.object({
  yaml: z
    .string()
    .trim()
    .min(1, 'O conteúdo YAML é obrigatório')
    .max(5 * 1024 * 1024, 'O conteúdo YAML excede o limite de 5 MB'),
});

export type SchemaImportBody = z.infer<typeof SchemaImportBodyValidator>;
export type SchemaImportPayload = z.infer<typeof SchemaImportPayloadValidator>;
export type SchemaImportTable = z.infer<typeof SchemaImportTableSchema>;
export type SchemaImportField = z.infer<typeof SchemaImportFieldSchema>;
