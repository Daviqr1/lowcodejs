import z from 'zod';

import { E_AI_LLM_PROVIDER } from '@application/core/entity.core';

export const SettingUpdateBodyValidator = z.object({
  SYSTEM_NAME: z
    .string()
    .trim()
    .min(1, 'O nome do sistema deve ter ao menos 1 caractere')
    .max(100, 'O nome do sistema deve ter no máximo 100 caracteres')
    .optional(),
  SYSTEM_DESCRIPTION: z
    .string()
    .trim()
    .min(1, 'A descrição do sistema deve ter ao menos 1 caractere')
    .max(200, 'A descrição do sistema deve ter no máximo 200 caracteres')
    .optional(),
  LOCALE: z
    .enum(['pt-br', 'en-us'], {
      message: 'O locale deve ser pt-br ou en-us',
    })
    .optional(),
  STORAGE_DRIVER: z
    .enum(['local', 's3'], {
      message: 'O driver de storage deve ser local ou s3',
    })
    .optional(),
  STORAGE_ENDPOINT: z.string().trim().optional(),
  STORAGE_REGION: z.string().trim().optional(),
  STORAGE_BUCKET: z.string().trim().optional(),
  STORAGE_ACCESS_KEY: z.string().trim().optional(),
  STORAGE_SECRET_KEY: z.string().trim().optional(),
  FILE_UPLOAD_MAX_SIZE: z.coerce
    .number({ message: 'O tamanho máximo de arquivo deve ser um número' })
    .min(1, 'O tamanho máximo de arquivo deve ser maior que zero')
    .optional(),
  FILE_UPLOAD_ACCEPTED: z
    .string()
    .trim()
    .min(1, 'As extensões aceitas devem ter ao menos 1 caractere')
    .optional(),
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: z.coerce
    .number({ message: 'O máximo de arquivos por upload deve ser um número' })
    .min(1, 'O máximo de arquivos por upload deve ser maior que zero')
    .optional(),
  PAGINATION_PER_PAGE: z.coerce
    .number({ message: 'A paginação deve ser um número' })
    .min(1, 'A paginação deve ser maior que zero')
    .optional(),
  MODEL_CLONE_TABLES: z.array(z.string()).optional(),
  EMAIL_PROVIDER_HOST: z.string().trim().nullable().optional(),
  EMAIL_PROVIDER_PORT: z.coerce.number().nullable().optional(),
  EMAIL_PROVIDER_USER: z.string().trim().nullable().optional(),
  EMAIL_PROVIDER_PASSWORD: z.string().trim().nullable().optional(),
  EMAIL_PROVIDER_FROM: z.string().trim().nullable().optional(),
  OPENAI_API_KEY: z.string().trim().nullable().optional(),
  AI_ASSISTANT_ENABLED: z.boolean().optional(),
  CHAT_HISTORY_ENABLED: z.boolean().optional(),
  MCP_SERVER_URL: z
    .string()
    .trim()
    .url('URL do servidor MCP inválida')
    .nullable()
    .optional(),
  MCP_SERVER_TOKEN: z.string().trim().nullable().optional(),
  MCP_LOWCODE_API_URL: z
    .string()
    .trim()
    .url('URL da API LowCodeJS inválida')
    .nullable()
    .optional(),
  OPENAI_MODEL: z.string().trim().min(1).optional(),
  AI_LLM_PROVIDER: z
    .enum([
      E_AI_LLM_PROVIDER.OPENAI,
      E_AI_LLM_PROVIDER.GEMINI,
      E_AI_LLM_PROVIDER.CLAUDE,
      E_AI_LLM_PROVIDER.OPENROUTER,
      E_AI_LLM_PROVIDER.OLLAMA,
    ])
    .optional(),
  LLM_API_KEY: z.string().trim().nullable().optional(),
  LLM_MODEL: z.string().trim().min(1).optional(),
  LLM_BASE_URL: z
    .string()
    .trim()
    .url('URL base do LLM inválida')
    .nullable()
    .optional(),
  LOGO_SMALL_URL: z
    .string({ message: 'A URL do logo pequeno deve ser um texto' })
    .trim()
    .nullable()
    .optional(),
  LOGO_LARGE_URL: z
    .string({ message: 'A URL do logo grande deve ser um texto' })
    .trim()
    .nullable()
    .optional(),
  LOGO_SMALL_DARK_URL: z
    .string({
      message: 'A URL do logo pequeno (modo escuro) deve ser um texto',
    })
    .trim()
    .nullable()
    .optional(),
  LOGO_LARGE_DARK_URL: z
    .string({ message: 'A URL do logo grande (modo escuro) deve ser um texto' })
    .trim()
    .nullable()
    .optional(),
  LOGIN_BACKGROUND_URL: z
    .string({ message: 'A URL da imagem de fundo do login deve ser um texto' })
    .trim()
    .nullable()
    .optional(),
});

export type SettingUpdatePayload = z.infer<typeof SettingUpdateBodyValidator>;
