import type { FastifySchema } from 'fastify';

import { buildErrorResponse } from '@application/core/schema.core';

export const MenuCreateSchema: FastifySchema = {
  tags: ['Menu'],
  summary: 'Criar um novo item de menu',
  description:
    'Cria um novo item de menu com nome, tipo e configurações opcionais',
  security: [{ cookieAuth: [] }],
  body: {
    type: 'object',
    required: ['name', 'type'],
    additionalProperties: false,
    errorMessage: {
      required: {
        name: 'O nome é obrigatório',
        type: 'O tipo é obrigatório',
      },
      additionalProperties: 'Campos extras não são permitidos',
    },
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'Nome do item de menu',
        errorMessage: {
          type: 'O nome deve ser um texto',
          minLength: 'O nome é obrigatório',
        },
      },
      type: {
        type: 'string',
        enum: [
          'TABLE',
          'PAGE',
          'FORM',
          'EXTERNAL',
          'SEPARATOR',
          'EXTENSION_MODULE',
        ],
        description: 'Tipo do item de menu',
        errorMessage: {
          type: 'O tipo deve ser um texto',
          enum: 'Tipo inválido',
        },
      },
      parent: {
        type: 'string',
        description: 'ID do menu pai',
        nullable: true,
        errorMessage: {
          type: 'O menu pai deve ser um texto',
        },
      },
      table: {
        type: 'string',
        description: 'ID da tabela (obrigatório para tipos TABLE/FORM)',
        nullable: true,
        errorMessage: {
          type: 'A tabela deve ser um texto',
        },
      },
      html: {
        type: 'string',
        description: 'Conteúdo HTML (obrigatório quando type=PAGE)',
        nullable: true,
        errorMessage: {
          type: 'O HTML deve ser um texto',
        },
      },
      url: {
        type: 'string',
        description: 'URL externa (obrigatório quando type=EXTERNAL)',
        nullable: true,
        errorMessage: {
          type: 'A URL deve ser um texto',
        },
      },
      icon: {
        type: 'string',
        description:
          'URL da imagem usada como ícone. Quando ausente, o frontend usa o ícone padrão por tipo',
        nullable: true,
        errorMessage: {
          type: 'O ícone deve ser um texto',
        },
      },
      order: {
        type: 'integer',
        minimum: 0,
        description:
          'Posição entre os irmãos. Quando ausente, o item vai para o fim',
        errorMessage: {
          type: 'A ordem deve ser um número inteiro',
          minimum: 'A ordem deve ser maior ou igual a zero',
        },
      },
      isInitial: {
        type: 'boolean',
        description: 'Define se este menu será carregado ao acessar o sistema',
        errorMessage: {
          type: 'Página inicial inválida',
        },
      },
      extension: {
        type: 'object',
        nullable: true,
        properties: {
          pkg: { type: 'string' },
          extensionId: { type: 'string' },
        },
        required: ['pkg', 'extensionId'],
        description:
          'Referência a um módulo de extensão (obrigatório quando type=EXTENSION_MODULE)',
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
    },
  },
  response: {
    201: {
      description: 'Item de menu criado com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do menu' },
        name: { type: 'string', description: 'Nome do menu' },
        slug: { type: 'string', description: 'Slug do menu' },
        type: { type: 'string', description: 'Tipo do menu' },
        parent: { type: 'string', nullable: true, description: 'ID do pai' },
        table: { type: 'string', nullable: true, description: 'ID da tabela' },
        // Vem populado do repositorio; declarado como `string` era serializado
        // literalmente como "[object Object]".
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
        html: { type: 'string', nullable: true, description: 'Conteúdo HTML' },
        url: { type: 'string', nullable: true, description: 'URL' },
        icon: {
          type: 'string',
          nullable: true,
          description: 'URL do ícone',
        },
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
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    400: buildErrorResponse(
      400,
      ['INVALID_PAYLOAD_FORMAT', 'INVALID_PARAMETERS', 'EXTENSION_NOT_ACTIVE'],
      {
        description: 'Requisição inválida - Falha na validação',
        messageDescription: 'Mensagem de erro',
        errorsDescription: 'Erros de validação por campo',
      },
    ),
    401: buildErrorResponse(401, 'AUTHENTICATION_REQUIRED', {
      description: 'Não autorizado - Autenticação necessária',
      message: 'Autenticação necessária',
    }),
    404: buildErrorResponse(
      404,
      ['TABLE_NOT_FOUND', 'PARENT_MENU_NOT_FOUND', 'EXTENSION_NOT_FOUND'],
      {
        description: 'Recurso não encontrado',
        message: [
          'Tabela não encontrada',
          'Menu pai não encontrado',
          'Módulo de extensão não encontrado',
        ],
      },
    ),
    409: buildErrorResponse(409, 'MENU_ALREADY_EXISTS', {
      description: 'Conflito - Menu com este nome já existe',
      message: 'Menu já existe',
    }),
    500: buildErrorResponse(500, 'CREATE_MENU_ERROR', {
      description: 'Erro interno do servidor',
      message: 'Erro interno do servidor',
    }),
  },
};
