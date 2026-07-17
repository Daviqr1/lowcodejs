import type { FastifySchema } from 'fastify';

export const SettingShowSchema: FastifySchema = {
  tags: ['Configurações'],
  summary: 'Buscar configurações do sistema',
  description:
    'Retorna todas as configurações do sistema incluindo locale, upload de arquivos e paginação',
  response: {
    200: {
      description: 'Configurações recuperadas com sucesso',
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
        LOCALE: {
          type: 'string',
          enum: ['pt-br', 'en-us'],
          description: 'Idioma padrão do sistema',
        },
        FILE_UPLOAD_MAX_SIZE: {
          type: 'number',
          description: 'Tamanho máximo de arquivo em bytes',
          examples: [10485760],
        },
        FILE_UPLOAD_ACCEPTED: {
          type: 'array',
          items: { type: 'string' },
          description: 'Extensões de arquivo aceitas',
          examples: [['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']],
        },
        FILE_UPLOAD_MAX_FILES_PER_UPLOAD: {
          type: 'number',
          description: 'Máximo de arquivos por upload',
          examples: [5],
        },
        PAGINATION_PER_PAGE: {
          type: 'number',
          description: 'Itens por página padrão',
          examples: [20],
        },
        MODEL_CLONE_TABLES: {
          type: 'array',
          nullable: true,
          description:
            'Configuração de tabelas permitidas para clonagem de modelos',
          errorMessage: {
            type: 'O modelo de tabelas deve ser um texto',
          },
        },
        DATABASE_URL: {
          type: 'string',
          description: 'URL de conexão do MongoDB',
          examples: ['mongodb://localhost:27017/lowcodejs'],
        },
        EMAIL_PROVIDER_HOST: {
          type: 'string',
          nullable: true,
          description: 'Host do servidor de email',
          examples: ['smtp.gmail.com'],
        },
        EMAIL_PROVIDER_PORT: {
          type: 'number',
          nullable: true,
          description: 'Porta do servidor de email',
          examples: [587],
        },
        EMAIL_PROVIDER_USER: {
          type: 'string',
          nullable: true,
          description: 'Usuário do servidor de email',
          examples: ['usuario@exemplo.com'],
        },
        EMAIL_PROVIDER_PASSWORD: {
          type: 'string',
          nullable: true,
          description: 'Senha do servidor de email',
        },
        EMAIL_PROVIDER_FROM: {
          type: 'string',
          nullable: true,
          description: 'Remetente (MAIL FROM) do servidor de email',
        },
        LOGO_SMALL_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do logo pequeno',
          examples: ['/assets/logo-small.webp'],
        },
        LOGO_LARGE_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do logo grande',
          examples: ['/assets/logo-large.webp'],
        },
        LOGO_SMALL_DARK_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do logo pequeno para o modo escuro',
          examples: ['/assets/logo-small-dark.webp'],
        },
        LOGO_LARGE_DARK_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do logo grande para o modo escuro',
          examples: ['/assets/logo-large-dark.webp'],
        },
        LOGIN_BACKGROUND_URL: {
          type: 'string',
          nullable: true,
          description: 'URL da imagem de fundo da tela de login',
          examples: ['/assets/login-background.webp'],
        },
        OPENAI_API_KEY: {
          type: 'string',
          nullable: true,
          description: 'Chave da API OpenAI para o assistente IA',
        },
        AI_ASSISTANT_ENABLED: {
          type: 'boolean',
          description: 'Habilitar ou desabilitar o assistente IA',
        },
        CHAT_HISTORY_ENABLED: {
          type: 'boolean',
          description: 'Salvar histórico do chat entre atualizações de página',
        },
        MCP_SERVER_URL: {
          type: 'string',
          nullable: true,
          description: 'URL do servidor MCP para o assistente IA',
        },
        MCP_SERVER_TOKEN: {
          type: 'string',
          nullable: true,
          description: 'Token de autenticação do servidor MCP (Bearer)',
        },
        MCP_LOWCODE_API_URL: {
          type: 'string',
          nullable: true,
          description:
            'URL da API LowCodeJS enviada ao MCP no header X-Lowcode-Api-Url',
        },
        OPENAI_MODEL: {
          type: 'string',
          nullable: true,
          description: 'Modelo OpenAI usado pelo assistente IA (legado)',
        },
        AI_LLM_PROVIDER: {
          type: 'string',
          enum: ['openai', 'gemini', 'claude', 'openrouter', 'ollama'],
          nullable: true,
          description: 'Provedor LLM do assistente IA',
        },
        LLM_API_KEY: {
          type: 'string',
          nullable: true,
          description: 'Chave da API do provedor LLM',
        },
        LLM_MODEL: {
          type: 'string',
          nullable: true,
          description: 'Modelo LLM do provedor selecionado',
        },
        LLM_BASE_URL: {
          type: 'string',
          nullable: true,
          description: 'URL base do LLM (ex.: Ollama local)',
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
        STORAGE_DRIVER: {
          type: 'string',
          description: 'Driver de armazenamento (local ou S3)',
        },
        STORAGE_ENDPOINT: {
          type: 'string',
          description: 'Endpoint do servidor S3',
        },
        STORAGE_REGION: {
          type: 'string',
          description: 'Região do S3',
        },
        STORAGE_BUCKET: {
          type: 'string',
          description: 'Nome do bucket S3',
        },
        STORAGE_ACCESS_KEY: {
          type: 'string',
          description: 'Chave de acesso S3',
        },
        STORAGE_SECRET_KEY: {
          type: 'string',
          description: 'Chave secreta S3',
        },
      },
      examples: [
        {
          LOCALE: 'pt-br',
          FILE_UPLOAD_MAX_SIZE: 10485760,
          FILE_UPLOAD_ACCEPTED: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
          FILE_UPLOAD_MAX_FILES_PER_UPLOAD: 5,
          PAGINATION_PER_PAGE: 20,
          DATABASE_URL: 'mongodb://localhost:27017/lowcodejs',
          EMAIL_PROVIDER_HOST: 'smtp.gmail.com',
          EMAIL_PROVIDER_PORT: 587,
          EMAIL_PROVIDER_USER: 'usuario@exemplo.com',
        },
      ],
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
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
