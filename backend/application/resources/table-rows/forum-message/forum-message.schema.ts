import type { FastifySchema } from 'fastify';

const ForumMessageBodyProperties = {
  text: {
    type: 'string',
    description: 'Conteúdo HTML/texto da mensagem',
  },
  attachments: {
    type: 'array',
    items: { type: 'string' },
    description: 'IDs de storage dos anexos',
  },
  mentions: {
    type: 'array',
    items: { type: 'string' },
    description: 'IDs dos usuários mencionados',
  },
  replyTo: {
    type: ['string', 'null'],
    description: 'ID da mensagem respondida',
  },
} as const;

const SUCCESS_RESPONSE = {
  description: 'Operação realizada - Retorna o registro atualizado',
  type: 'object',
  additionalProperties: true,
} as const;

const UNAUTHORIZED_RESPONSE = {
  description: 'Não autorizado - Autenticação necessária',
  type: 'object',
  properties: {
    message: { type: 'string' },
    code: { type: 'number', enum: [401] },
    cause: {
      type: 'string',
      enum: ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
    },
    errors: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

const FORBIDDEN_PERMISSION_CAUSES = [
  'USER_NOT_FOUND',
  'USER_NOT_ACTIVE',
  'PERMISSIONS_NOT_FOUND',
  'INSUFFICIENT_PERMISSIONS',
  'OWNER_OR_ADMIN_REQUIRED',
  'TABLE_PRIVATE',
  'RESTRICTED_CREATE',
  'FORM_VIEW_RESTRICTED',
] as const;

export const ForumMessageCreateSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Cria uma mensagem de fórum no canal (registro)',
  description:
    'Adiciona uma mensagem ao registro de uma tabela com estilo FORUM. Apenas o criador ou membros podem postar em canais privados. A mensagem deve ter texto ou pelo menos um anexo. Menções geram notificação por email.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela (canal)' },
      _id: { type: 'string', description: 'ID do registro (canal)' },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    properties: ForumMessageBodyProperties,
    additionalProperties: false,
  },
  response: {
    200: SUCCESS_RESPONSE,
    400: {
      description: 'Requisição inválida',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: [
            'FORUM_TABLE_REQUIRED',
            'FORUM_MESSAGES_FIELD_NOT_FOUND',
            'FORUM_MESSAGE_EMPTY',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    401: UNAUTHORIZED_RESPONSE,
    403: {
      description:
        'Acesso negado - Permissão insuficiente ou sem acesso ao canal',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [...FORBIDDEN_PERMISSION_CAUSES, 'FORUM_CHANNEL_ACCESS_DENIED'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Tabela ou registro não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['FORUM_MESSAGE_CREATE_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};

export const ForumMessageUpdateSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Atualiza a própria mensagem de fórum no canal (registro)',
  description:
    'Edita uma mensagem existente do registro de uma tabela com estilo FORUM. Apenas o autor da mensagem pode editá-la. Apenas novos mencionados são notificados.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id', 'messageId'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela (canal)' },
      _id: { type: 'string', description: 'ID do registro (canal)' },
      messageId: { type: 'string', description: 'ID da mensagem' },
    },
    additionalProperties: false,
  },
  body: {
    type: 'object',
    properties: ForumMessageBodyProperties,
    additionalProperties: false,
  },
  response: {
    200: SUCCESS_RESPONSE,
    400: {
      description: 'Requisição inválida',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: [
            'FORUM_TABLE_REQUIRED',
            'FORUM_MESSAGES_FIELD_NOT_FOUND',
            'FORUM_MESSAGE_EMPTY',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    401: UNAUTHORIZED_RESPONSE,
    403: {
      description:
        'Acesso negado - Permissão insuficiente, sem acesso ao canal ou não é o autor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [
            ...FORBIDDEN_PERMISSION_CAUSES,
            'FORUM_CHANNEL_ACCESS_DENIED',
            'FORUM_MESSAGE_AUTHOR_REQUIRED',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Tabela, registro ou mensagem não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND', 'FORUM_MESSAGE_NOT_FOUND'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['FORUM_MESSAGE_UPDATE_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};

export const ForumMessageDeleteSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Exclui a própria mensagem de fórum no canal (registro)',
  description:
    'Remove uma mensagem do registro de uma tabela com estilo FORUM. Apenas o autor da mensagem pode excluí-la.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id', 'messageId'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela (canal)' },
      _id: { type: 'string', description: 'ID do registro (canal)' },
      messageId: { type: 'string', description: 'ID da mensagem' },
    },
    additionalProperties: false,
  },
  response: {
    200: SUCCESS_RESPONSE,
    400: {
      description: 'Requisição inválida',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: ['FORUM_TABLE_REQUIRED', 'FORUM_MESSAGES_FIELD_NOT_FOUND'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    401: UNAUTHORIZED_RESPONSE,
    403: {
      description:
        'Acesso negado - Permissão insuficiente, sem acesso ao canal ou não é o autor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [
            ...FORBIDDEN_PERMISSION_CAUSES,
            'FORUM_CHANNEL_ACCESS_DENIED',
            'FORUM_MESSAGE_AUTHOR_REQUIRED',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Tabela, registro ou mensagem não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND', 'FORUM_MESSAGE_NOT_FOUND'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['FORUM_MESSAGE_DELETE_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};

export const ForumMessageMentionReadSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Marca menção de fórum como lida',
  description:
    'Marca a menção do usuário em uma mensagem de fórum como lida. O usuário deve ter sido mencionado na mensagem.',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['slug', '_id', 'messageId'],
    properties: {
      slug: { type: 'string', description: 'Slug da tabela (canal)' },
      _id: { type: 'string', description: 'ID do registro (canal)' },
      messageId: { type: 'string', description: 'ID da mensagem' },
    },
    additionalProperties: false,
  },
  response: {
    200: SUCCESS_RESPONSE,
    400: {
      description: 'Requisição inválida',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: [
            'FORUM_TABLE_REQUIRED',
            'FORUM_MESSAGES_FIELD_NOT_FOUND',
            'FORUM_MENTION_READ_FIELD_NOT_FOUND',
            'FORUM_MENTION_NOT_FOUND',
          ],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    401: UNAUTHORIZED_RESPONSE,
    403: {
      description:
        'Acesso negado - Permissão insuficiente ou sem acesso ao canal',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [403] },
        cause: {
          type: 'string',
          enum: [...FORBIDDEN_PERMISSION_CAUSES, 'FORUM_CHANNEL_ACCESS_DENIED'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    404: {
      description: 'Tabela, registro ou mensagem não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: {
          type: 'string',
          enum: ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND', 'FORUM_MESSAGE_NOT_FOUND'],
        },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['FORUM_MENTION_READ_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
