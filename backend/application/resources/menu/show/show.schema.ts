import type { FastifySchema } from 'fastify';

export const MenuShowSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Buscar menu por ID',
  description: 'Retorna um item de menu específico pelo seu ID',
  security: [{ cookieAuth: [] }],
  params: {
    type: 'object',
    required: ['_id'],
    properties: {
      _id: {
        type: 'string',
        minLength: 1,
        description: 'ID do menu',
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
      description: 'Detalhes do item de menu',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do menu' },
        name: { type: 'string', description: 'Nome do menu' },
        slug: { type: 'string', description: 'Slug do menu' },
        type: { type: 'string', description: 'Tipo do menu' },
        parent: {
          type: 'object',
          nullable: true,
          description: 'Menu pai',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            type: { type: 'string' },
          },
        },
        table: {
          type: 'object',
          nullable: true,
          description: 'Tabela associada',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        owner: {
          type: 'object',
          nullable: true,
          description: 'Criador do menu',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
          },
        },
        html: {
          type: 'string',
          nullable: true,
          description: 'Conteúdo HTML',
        },
        url: { type: 'string', nullable: true, description: 'URL' },
        order: { type: 'number', description: 'Ordem do menu' },
        isInitial: {
          type: 'boolean',
          description: 'Se é o menu inicial do sistema',
        },
        visibility: {
          type: 'object',
          nullable: true,
          description: 'Visibilidade da opção de menu (Grupo|Public|Nobody)',
          properties: {
            kind: { type: 'string', enum: ['PUBLIC', 'NOBODY', 'GROUP'] },
            group: { type: 'string', nullable: true },
          },
        },
        trashed: { type: 'boolean', description: 'Se está na lixeira' },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Data de envio para lixeira',
        },
        children: {
          type: 'array',
          description: 'Itens de menu filhos ativos',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', description: 'ID do menu filho' },
              name: { type: 'string', description: 'Nome do menu filho' },
              type: { type: 'string', description: 'Tipo do menu filho' },
              slug: { type: 'string', description: 'Slug do menu filho' },
            },
          },
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
      description: 'Menu não encontrado',
      type: 'object',
      properties: {
        message: { type: 'string', enum: ['Menu não encontrado'] },
        code: { type: 'number', enum: [404] },
        cause: { type: 'string', enum: ['MENU_NOT_FOUND'] },
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
        cause: { type: 'string', enum: ['GET_MENU_BY_ID_ERROR'] },
        errors: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
};
