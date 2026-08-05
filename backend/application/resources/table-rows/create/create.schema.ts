import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  TableRowBodyValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

export const TableRowCreateSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Criar registro',
  description:
    'Cria um novo registro em uma tabela com schema dinâmico baseado nos campos da tabela. Autenticação é obrigatória apenas quando a colaboração da tabela é "restrita". Tabelas com colaboração "aberta" ou visibilidade "FORM" permitem acesso público.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  body: zodToRouteSchema(TableRowBodyValidator),
  response: {
    201: {
      description: 'Registro criado com sucesso com relacionamentos populados',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do registro' },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'Estado de rascunho (publicado após salvar com sucesso)',
        },
        draftAt: {
          type: 'string',
          nullable: true,
          description:
            'Quando o registro foi salvo como rascunho (null quando publicado)',
        },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description:
            'Quando o registro foi enviado para a lixeira (null para registros ativos)',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data de criação',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Data da última atualização',
        },
      },
      additionalProperties: true,
    },
    400: {
      description: 'Requisição inválida - Falha na validação dos campos',
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Mensagem de erro' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: {
          type: 'object',
          description:
            'Objeto com erros de validação por campo. A chave é o slug do campo e o valor é a mensagem de erro.',
          additionalProperties: { type: 'string' },
        },
      },
    },
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autorizado - Autenticação necessária',
        messageDescription: 'Mensagem de erro',
      },
    ),
    403: buildErrorResponse(
      403,
      [
        'USER_NOT_FOUND',
        'USER_NOT_ACTIVE',
        'PERMISSIONS_NOT_FOUND',
        'INSUFFICIENT_PERMISSIONS',
        'OWNER_OR_ADMIN_REQUIRED',
        'TABLE_PRIVATE',
        'RESTRICTED_CREATE',
        'FORM_VIEW_RESTRICTED',
      ],
      {
        description: 'Acesso negado - Permissões insuficientes',
        messageDescription: 'Mensagem de erro',
      },
    ),
    404: buildErrorResponse(404, 'TABLE_NOT_FOUND', {
      description: 'Não encontrado - Tabela não existe',
      messageDescription: 'Mensagem de erro',
    }),
    500: buildErrorResponse(500, 'CREATE_ROW_ERROR', {
      description: 'Erro interno do servidor',
      messageDescription: 'Mensagem de erro',
    }),
  },
};
