import type { FastifySchema } from 'fastify';

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
          enum: ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS'],
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
    409: {
      description: 'Conflito - Grupo já existe',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Grupo já existe'] },
        code: { type: 'number', enum: [409] },
        cause: { type: 'string', enum: ['GROUP_EXISTS'] },
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
        cause: { type: 'string', enum: ['CREATE_USER_GROUP_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
