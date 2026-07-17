import type { FastifySchema } from 'fastify';

export const SettingPublicSchema: FastifySchema = {
  tags: ['Configurações'],
  summary: 'Buscar configurações públicas do sistema',
  description:
    'Retorna apenas o subconjunto de configurações seguro para visitantes não autenticados (branding, logos, flags de setup e IA). Usado pelo SSR do frontend.',
  response: {
    200: {
      description: 'Configurações públicas recuperadas com sucesso',
      type: 'object',
      properties: {
        SYSTEM_NAME: {
          type: 'string',
          description: 'Nome do sistema exibido no título da plataforma',
          examples: ['LowCodeJs'],
        },
        SYSTEM_DESCRIPTION: {
          type: 'string',
          description: 'Descrição curta do sistema usada em SEO/og:description',
          examples: ['Plataforma Oficial'],
        },
        LOGO_SMALL_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do logo pequeno',
          examples: ['/storage/logo-small.webp'],
        },
        LOGO_LARGE_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do logo grande',
          examples: ['/storage/logo-large.webp'],
        },
        LOGO_SMALL_DARK_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do logo pequeno para o modo escuro',
          examples: ['/storage/logo-small-dark.webp'],
        },
        LOGO_LARGE_DARK_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do logo grande para o modo escuro',
          examples: ['/storage/logo-large-dark.webp'],
        },
        LOGIN_BACKGROUND_URL: {
          type: 'string',
          nullable: true,
          description: 'URL da imagem de fundo da tela de login',
          examples: ['/storage/login-background.webp'],
        },
        AI_ASSISTANT_ENABLED: {
          type: 'boolean',
          description: 'Indica se o assistente IA está habilitado',
        },
        CHAT_HISTORY_ENABLED: {
          type: 'boolean',
          description:
            'Indica se o histórico do chat é salvo entre atualizações',
        },
        SETUP_COMPLETED: {
          type: 'boolean',
          description: 'Indica se o setup inicial foi concluído',
        },
        SETUP_CURRENT_STEP: {
          type: 'string',
          nullable: true,
          enum: [
            'admin',
            'name',
            'storage',
            'logos',
            'upload',
            'paging',
            'email',
          ],
          description: 'Etapa atual do setup wizard (null se concluído)',
        },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['SETTINGS_READ_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
