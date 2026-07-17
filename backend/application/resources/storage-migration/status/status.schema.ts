import type { FastifySchema } from 'fastify';

export const StorageMigrationStatusSchema: FastifySchema = {
  tags: ['Migração de Armazenamento'],
  summary: 'Status atual da migração de arquivos',
  description:
    'Retorna a quantidade de arquivos por driver, status de migração por arquivo e se um job está em andamento. Restrito ao usuário MASTER.',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            current_driver: { type: 'string', enum: ['local', 's3'] },
            previous_driver: { type: 'string', enum: ['local', 's3'] },
            total_files: { type: 'number' },
            by_location: {
              type: 'object',
              properties: {
                local: { type: 'number' },
                s3: { type: 'number' },
              },
            },
            by_status: {
              type: 'object',
              properties: {
                idle: { type: 'number' },
                pending: { type: 'number' },
                in_progress: { type: 'number' },
                failed: { type: 'number' },
              },
            },
            migration_in_progress: { type: 'boolean' },
            active_job_id: { type: ['string', 'null'] },
            last_run_at: { type: ['string', 'null'], format: 'date-time' },
            can_cleanup: { type: 'boolean' },
          },
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    403: {
      description: 'Acesso negado - Permissão insuficiente',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: { type: 'string', enum: ['FORBIDDEN'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['SERVER_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
