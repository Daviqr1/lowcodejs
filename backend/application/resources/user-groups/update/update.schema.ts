import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

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
    400: buildErrorResponse(
      400,
      [
        'INVALID_PAYLOAD_FORMAT',
        'INVALID_PARAMETERS',
        'GROUP_SELF_REFERENCE',
        'GROUP_CYCLE_DETECTED',
      ],
      {
        description: 'Requisição inválida - Falha na validação',
        messageDescription: 'Mensagem de erro de validação',
        errorsDescription: 'Erros de validação por campo',
      },
    ),
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'USER_GROUP_NOT_FOUND', {
      description: 'Grupo de usuários não encontrado',
      message: 'Grupo de usuários não encontrado',
    }),
    500: buildErrorResponse(500, 'UPDATE_USER_GROUP_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
