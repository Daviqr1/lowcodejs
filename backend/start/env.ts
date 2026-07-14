import { config } from 'dotenv';
import { z } from 'zod';

let envFile = '.env';
if (process.env.NODE_ENV === 'test') envFile = '.env.test';
config({ path: envFile, quiet: true });

const EnvSchema = z.object({
  DATABASE_URL: z.string().trim(),
  DB_DATABASE: z.string().trim().default('lowcodejs'),
  DB_DATA_DATABASE: z.string().trim().default('lowcodejs_data'),

  JWT_PUBLIC_KEY: z.string().trim(),
  JWT_PRIVATE_KEY: z.string().trim(),
  COOKIE_SECRET: z.string().trim(),
  COOKIE_DOMAIN: z.string().trim().optional(),

  // Chave simétrica usada pelo módulo Senhas (apps/modules/senhas) para cifrar
  // os segredos em repouso (AES-256-GCM). Opcional: se ausente, o módulo deriva
  // a chave do COOKIE_SECRET (conveniente em dev; em produção defina uma chave
  // dedicada e estável — trocá-la torna os segredos existentes ilegíveis).
  PASSWORDS_ENCRYPTION_KEY: z.string().trim().optional(),

  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  DEMO_MODE: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v): boolean => v === 'true'),

  APP_SERVER_URL: z.string().trim(),
  APP_CLIENT_URL: z.string().trim(),

  ALLOWED_ORIGINS: z
    .string()
    .default('https://lowcodejs.org;*.lowcodejs.org')
    .transform((val) =>
      val
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  REDIS_URL: z.string().trim().default('redis://localhost:6379'),

  MCP_SERVER_URL: z.string().trim().optional(),

  STORAGE_MIGRATION_CONCURRENCY: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5),

  EMAIL_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),

  // Liga/desliga a engine de agendamentos (decorators @Cron/@Interval/@Timeout)
  // no boot. Útil para desativar timers em ambientes de teste/manutenção.
  SCHEDULER_ENABLED: z
    .union([z.literal('true'), z.literal('false')])
    .default('true')
    .transform((v): boolean => v === 'true'),
});

const validation = EnvSchema.safeParse(process.env);

if (!validation.success) {
  console.error('Invalid environment variables', validation.error.issues);
  throw new Error('Invalid environment variables');
}

export const Env = validation.data;
