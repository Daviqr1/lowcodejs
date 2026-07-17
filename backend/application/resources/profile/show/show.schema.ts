import type { FastifySchema } from 'fastify';

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
    404: {
      description: 'Usuário não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['USER_NOT_FOUND'] },
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
        cause: { type: 'string', enum: ['GET_USER_PROFILE_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
