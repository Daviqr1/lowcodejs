import z from 'zod';

import { email, strongPassword } from '@application/features/_shared.validator';

/**
 * Entrada da fatia `setup`. Fonte unica — os `*.schema.ts` derivam daqui o
 * JSON Schema da rota com `zodToRouteSchema`.
 *
 * Cada etapa do wizard tinha o seu `submit.validator.ts`, nome que ja fugia da
 * convencao (`{operacao}.validator.ts`, e a operacao e `admin`, `email`, ...).
 * As regras cruzadas sao `.refine()`, que nao vai para o JSON Schema: o schema
 * da rota descreve a forma e o `.parse()` do controller garante a regra.
 */

// ── Administrador ─────────────────────────────────────────────────────

export const SetupAdminBodyValidator = z
  .object({
    name: z
      .string({ message: 'O nome é obrigatório' })
      .min(1, 'O nome é obrigatório')
      .trim(),
    email: email(),
    password: strongPassword(),
    confirmPassword: z
      .string({ message: 'A confirmação de senha é obrigatória' })
      .min(1, 'A confirmação de senha é obrigatória')
      .trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });

export type SetupAdminPayload = z.infer<typeof SetupAdminBodyValidator>;

// ── SMTP ──────────────────────────────────────────────────────────────

export const SetupEmailBodyValidator = z
  .object({
    EMAIL_PROVIDER_HOST: z.string().trim().nullable().optional(),
    EMAIL_PROVIDER_PORT: z.coerce.number().nullable().optional(),
    EMAIL_PROVIDER_USER: z.string().trim().nullable().optional(),
    EMAIL_PROVIDER_PASSWORD: z.string().trim().nullable().optional(),
    EMAIL_PROVIDER_FROM: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.EMAIL_PROVIDER_HOST) return true;
      return !!(
        data.EMAIL_PROVIDER_PORT &&
        data.EMAIL_PROVIDER_USER &&
        data.EMAIL_PROVIDER_PASSWORD &&
        data.EMAIL_PROVIDER_FROM
      );
    },
    {
      message:
        'Se o host SMTP for preenchido, porta, usuário, senha e remetente são obrigatórios',
      path: ['EMAIL_PROVIDER_HOST'],
    },
  );

export type SetupEmailPayload = z.infer<typeof SetupEmailBodyValidator>;

// ── Identidade visual ─────────────────────────────────────────────────

export const SetupLogosBodyValidator = z.object({
  LOGO_SMALL_URL: z
    .string({ message: 'A URL do logo pequeno deve ser um texto' })
    .trim()
    .nullable(),
  LOGO_LARGE_URL: z
    .string({ message: 'A URL do logo grande deve ser um texto' })
    .trim()
    .nullable(),
});

export type SetupLogosPayload = z.infer<typeof SetupLogosBodyValidator>;

export const SetupNameBodyValidator = z.object({
  SYSTEM_NAME: z
    .string({ message: 'O nome do sistema é obrigatório' })
    .trim()
    .min(1, 'O nome do sistema deve ter ao menos 1 caractere')
    .max(100, 'O nome do sistema deve ter no máximo 100 caracteres'),
  LOCALE: z.enum(['pt-br', 'en-us'], {
    message: 'O locale deve ser pt-br ou en-us',
  }),
});

export type SetupNamePayload = z.infer<typeof SetupNameBodyValidator>;

// ── Listagem e upload ─────────────────────────────────────────────────

export const SetupPagingBodyValidator = z.object({
  PAGINATION_PER_PAGE: z.coerce
    .number({ message: 'A paginação deve ser um número' })
    .min(1, 'A paginação deve ser maior que zero'),
  MODEL_CLONE_TABLES: z.array(z.string()).optional(),
});

export type SetupPagingPayload = z.infer<typeof SetupPagingBodyValidator>;

export const SetupUploadBodyValidator = z.object({
  FILE_UPLOAD_MAX_SIZE: z.coerce
    .number({ message: 'O tamanho máximo de arquivo deve ser um número' })
    .min(1, 'O tamanho máximo de arquivo deve ser maior que zero'),
  FILE_UPLOAD_ACCEPTED: z
    .string()
    .trim()
    .min(1, 'As extensões aceitas devem ter ao menos 1 caractere'),
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: z.coerce
    .number({ message: 'O máximo de arquivos por upload deve ser um número' })
    .min(1, 'O máximo de arquivos por upload deve ser maior que zero'),
});

export type SetupUploadPayload = z.infer<typeof SetupUploadBodyValidator>;

// ── Armazenamento ─────────────────────────────────────────────────────

export const SetupStorageBodyValidator = z
  .object({
    STORAGE_DRIVER: z.enum(['local', 's3'], {
      message: 'O driver de armazenamento deve ser "local" ou "s3"',
    }),
    STORAGE_ENDPOINT: z.string().trim().optional(),
    STORAGE_REGION: z.string().trim().optional(),
    STORAGE_BUCKET: z.string().trim().optional(),
    STORAGE_ACCESS_KEY: z.string().trim().optional(),
    STORAGE_SECRET_KEY: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.STORAGE_DRIVER !== 's3') return true;
      return (
        !!data.STORAGE_ENDPOINT &&
        !!data.STORAGE_BUCKET &&
        !!data.STORAGE_ACCESS_KEY &&
        !!data.STORAGE_SECRET_KEY
      );
    },
    {
      message:
        'Endpoint, bucket, access key e secret key são obrigatórios para S3',
      path: ['STORAGE_ENDPOINT'],
    },
  );

export type SetupStoragePayload = z.infer<typeof SetupStorageBodyValidator>;
