import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const UserGroupCreateSchema: FastifySchema = {
  tags: ['Grupos de Usuários'],
  summary: 'Criar um novo grupo de usuários',
  description:
    'Cria um novo grupo de usuários com nome, descrição e permissões',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['name', 'permissions'],
    additionalProperties: false,
    errorMessage: {
      required: {
        name: 'O nome é obrigatório',
        permissions: 'Pelo menos uma permissão é obrigatória',
      },
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
        description: 'Descrição do grupo de usuários',
        errorMessage: {
          type: 'A descrição deve ser um texto',
        },
      },
      permissions: {
        type: 'array',
        minItems: 1,
        items: { type: 'string' },
        description:
          'IDs das permissões globais do grupo (12 de tabela + 7 de área). ' +
          'Capacidades de área liberam as áreas do sistema; as permissões de ' +
          'tabela compõem a regra de interseção com os bindings da tabela.',
        errorMessage: {
          type: 'Permissões deve ser uma lista',
          minItems: 'Pelo menos uma permissão é obrigatória',
        },
      },
      encompasses: {
        type: 'array',
        items: { type: 'string' },
        description:
          'IDs dos grupos englobados (Engloba). O grupo herda as permissões ' +
          'de tudo que engloba (fecho transitivo).',
        errorMessage: {
          type: 'Grupos englobados deve ser uma lista',
        },
      },
    },
  },
  response: {
    201: {
      description: 'Grupo de usuários criado com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do grupo' },
        name: { type: 'string', description: 'Nome do grupo' },
        slug: { type: 'string', description: 'Identificador único do grupo' },
        description: { type: 'string', description: 'Descrição do grupo' },
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
              trashed: {
                type: 'boolean',
                description: 'Se a permissão está na lixeira',
              },
              trashedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'Data em que foi movido para lixeira',
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
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
      ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
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
    409: buildErrorResponse(409, 'GROUP_EXISTS', {
      description: 'Conflito - Grupo já existe',
      message: 'Grupo já existe',
    }),
    500: buildErrorResponse(500, 'CREATE_USER_GROUP_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
