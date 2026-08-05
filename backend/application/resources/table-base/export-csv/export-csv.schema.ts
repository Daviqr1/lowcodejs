import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { TableExportCsvQueryValidator } from '../_shared.validator';

export const TableExportCsvSchema: FastifySchema = {
  tags: ['Tabelas'],
  summary: 'Exporta tabelas em CSV',
  description:
    'Gera um arquivo CSV com a metadata de todas as tabelas que casam com os filtros aplicados. Restrito a quem tem acesso privilegiado às tabelas. Cap de 500.000 linhas por export.',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(TableExportCsvQueryValidator),
  response: {
    200: { description: 'Arquivo CSV', type: 'string', format: 'binary' },
    400: buildErrorResponse(400, 'TABLE_REQUIRED', {
      description: 'Requisição inválida - Ação exige uma tabela',
    }),
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autenticado - Autenticação necessária',
      },
    ),
    403: buildErrorResponse(
      403,
      [
        'USER_NOT_FOUND',
        'USER_NOT_ACTIVE',
        'PERMISSIONS_NOT_FOUND',
        'INSUFFICIENT_PERMISSIONS',
      ],
      {
        description: 'Acesso negado - Permissão insuficiente',
      },
    ),
    422: {
      description: 'Resultado excede o limite de linhas para exportação',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [422] },
        cause: { type: 'string', enum: ['EXPORT_LIMIT_EXCEEDED'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    500: {
      description: 'Erro interno do servidor',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [500] },
        cause: { type: 'string', enum: ['EXPORT_TABLE_CSV_ERROR'] },
        errors: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
};
