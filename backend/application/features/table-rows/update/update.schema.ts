import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  TableRowBodyValidator,
  TableRowParamsValidator,
} from '../_shared.validator';

export const TableRowUpdateSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Atualizar registro',
  description:
    'Atualiza um registro existente em uma tabela com schema dinâmico baseado nos campos da tabela. Permite atualização parcial (campos não enviados mantêm o valor atual).',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableRowParamsValidator),
  body: zodToRouteSchema(TableRowBodyValidator),
  response: {
    200: {
      description:
        'Registro atualizado com sucesso com relacionamentos populados',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do registro' },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'Estado de rascunho',
        },
        draftAt: {
          type: 'string',
          nullable: true,
          description: 'Quando o registro foi salvo como rascunho',
        },
        trashedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          description: 'Quando o registro foi enviado para a lixeira',
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
    404: buildErrorResponse(404, ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'], {
      description: 'Não encontrado - Tabela ou registro não existe',
      messageDescription: 'Mensagem de erro',
    }),
    500: buildErrorResponse(500, 'UPDATE_ROW_TABLE_ERROR', {
      description: 'Erro interno do servidor',
      messageDescription: 'Mensagem de erro',
    }),
  },
};
