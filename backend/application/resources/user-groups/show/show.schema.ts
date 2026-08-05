import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

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
    400: buildErrorResponse(400, 'INVALID_PAYLOAD_FORMAT', {
      description: 'Requisição inválida - Falha na validação',
      messageDescription: 'Mensagem de erro',
      errorsDescription: 'Erros de validação por campo',
    }),
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'USER_GROUP_NOT_FOUND', {
      description: 'Grupo de usuários não encontrado',
      message: 'Grupo de usuários não encontrado',
    }),
    500: buildErrorResponse(500, 'GET_USER_GROUP_BY_ID_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
