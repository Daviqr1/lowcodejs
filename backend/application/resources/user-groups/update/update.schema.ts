import type { FastifySchema } from 'fastify';

export const UserGroupUpdateSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Atualizar grupo de usuários',
  description:
    'Atualiza um grupo de usuários existente com nova descrição e permissões',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        minLength: 1,
        description: 'ID do grupo de usuários',
        errorMessage: {
          type: 'O ID deve ser um texto',
          minLength: 'O ID é obrigatório',
        },
      },
    },
    errorMessage: {
      required: {
        _id: 'O ID é obrigatório',
      },
    },
  },
  body: {
    type: 'object',
    additionalProperties: false,
    errorMessage: {
      additionalProperties: 'Campos extras não são permitidos',
    },
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'Nome do grupo de usuários',
        errorMessage: {
          type: 'O nome deve ser um texto',
          minLength: 'O nome é obrigatório',
        },
      },
      description: {
        type: 'string',
        nullable: true,
        description: 'Descrição atualizada do grupo de usuários',
        errorMessage: {
          type: 'A descrição deve ser um texto',
        },
      },
      permissions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista atualizada de IDs de permissões',
        errorMessage: {
          type: 'Permissões deve ser uma lista',
        },
      },
      encompasses: {
        type: 'array',
        items: { type: 'string' },
        description: 'Lista atualizada de IDs de grupos englobados',
        errorMessage: {
          type: 'Grupos englobados deve ser uma lista',
        },
      },
    },
  },
  response: {
    200: {
      description: 'Detalhes do grupo de usuários atualizado',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do grupo' },
        name: { type: 'string', description: 'Nome do grupo' },
        description: { type: 'string', description: 'Descrição do grupo' },
        slug: { type: 'string', description: 'Identificador único do grupo' },
        permissions: {
          type: 'array',
          description: 'Permissões atribuídas ao grupo',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'ID da permissão' },
              name: { type: 'string', description: 'Nome da permissão' },
              slug: { type: 'string', description: 'Slug da permissão' },
              description: {
                type: 'string',
                description: 'Descrição da permissão',
              },
            },
          },
        },
        encompasses: {
          type: 'array',
          description: 'IDs dos grupos englobados',
          items: { type: 'string' },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    400: {
      description: 'Requisição inválida - Falha na validação',
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Mensagem de erro de validação',
        },
        code: { type: 'number', enum: [400] },
        cause: {
          type: 'string',
          enum: [
            'INVALID_PAYLOAD_FORMAT',
            'INVALID_PARAMETERS',
            'GROUP_SELF_REFERENCE',
            'GROUP_CYCLE_DETECTED',
          ],
        },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'Erros de validação por campo',
        },
      },
    },
    401: {
      description: 'Não autorizado - Autenticação necessária',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Autenticação necessária'] },
        code: { type: 'number', enum: [401] },
        cause: { type: 'string', enum: ['AUTHENTICATION_REQUIRED'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Grupo de usuários não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Grupo de usuários não encontrado'] },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['USER_GROUP_NOT_FOUND'] },
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
        message: { type: 'string', enum: ['Erro interno do servidor'] },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['UPDATE_USER_GROUP_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
