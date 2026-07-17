import type { FastifySchema } from 'fastify';

export const UserGroupShowSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Buscar grupo de usuários por ID',
  description: 'Retorna um grupo de usuários específico pelo seu ID',
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
  response: {
    200: {
      description: 'Detalhes do grupo de usuários',
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
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
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
        cause: { type: 'string', enum: ['GET_USER_GROUP_BY_ID_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
