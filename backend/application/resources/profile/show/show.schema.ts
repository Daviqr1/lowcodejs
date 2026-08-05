import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const ProfileShowSchema: FastifySchema = {
  tags: ['Perfil'],
  summary: 'Buscar perfil do usuário atual',
  description:
    'Retorna as informações do perfil do usuário autenticado incluindo dados pessoais, grupo e permissões',
  security: [{ cookieAuth: [] }],
  response: {
    200: {
      description: 'Perfil do usuário recuperado com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do usuário' },
        name: { type: 'string', description: 'Nome completo do usuário' },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email do usuário',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE'],
          description: 'Status da conta do usuário',
        },
        group: {
          type: 'object',
          description: 'Grupo do usuário com permissões populadas',
          properties: {
            _id: { type: 'string', description: 'ID do grupo' },
            name: { type: 'string', description: 'Nome do grupo' },
            slug: { type: 'string', description: 'Slug do grupo' },
            description: {
              type: 'string',
              nullable: true,
              description: 'Descrição do grupo',
            },
            permissions: {
              type: 'array',
              description: 'Array de permissões atribuídas ao grupo',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string', description: 'ID da permissão' },
                  name: { type: 'string', description: 'Nome da permissão' },
                  slug: { type: 'string', description: 'Slug da permissão' },
                  description: {
                    type: 'string',
                    nullable: true,
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
        capabilities: {
          type: 'array',
          description:
            'Capacidades de área resolvidas pelo fecho de grupos (slugs de permissão); usado pelo frontend para liberar a navegação por capability',
          items: { type: 'string' },
        },
        groups: {
          type: 'array',
          description: 'Grupos adicionais do usuário (multi-grupo)',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              permissions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    slug: { type: 'string' },
                  },
                },
              },
              encompasses: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data de criação da conta',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data da última atualização do perfil',
        },
      },
    },
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
    }),
    404: buildErrorResponse(404, 'USER_NOT_FOUND', {
      description: 'Usuário não encontrado',
    }),
    500: buildErrorResponse(500, 'GET_USER_PROFILE_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
