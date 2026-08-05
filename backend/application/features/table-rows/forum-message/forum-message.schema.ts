import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  ForumMessageCreateBodyValidator,
  ForumMessageParamsValidator,
  ForumMessageUpdateBodyValidator,
  TableRowParamsValidator,
} from '../_shared.validator';

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
  params: zodToRouteSchema(TableRowParamsValidator),
  body: zodToRouteSchema(ForumMessageCreateBodyValidator),
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
  params: zodToRouteSchema(ForumMessageParamsValidator),
  body: zodToRouteSchema(ForumMessageUpdateBodyValidator),
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
  params: zodToRouteSchema(ForumMessageParamsValidator),
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
  params: zodToRouteSchema(ForumMessageParamsValidator),
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
