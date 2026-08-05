import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  TableRowAutoSaveBodyValidator,
  TableRowAutoSaveQueryValidator,
  TableSlugParamsValidator,
} from '../_shared.validator';

export const TableRowAutoSaveSchema: FastifySchema = {
  tags: ['Registros'],
  summary: 'Auto-salvar registro como rascunho',
  description:
    'Persiste um registro parcial como rascunho (status="draft") sem disparar validações de obrigatoriedade. Quando "_id" é informado na query, atualiza o rascunho existente; caso contrário, cria um novo. Apenas o formato/tipo dos campos preenchidos é validado.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(TableSlugParamsValidator),
  querystring: zodToRouteSchema(TableRowAutoSaveQueryValidator),
  body: zodToRouteSchema(TableRowAutoSaveBodyValidator),
  response: {
    201: {
      description: 'Rascunho salvo com sucesso',
      type: 'object',
      properties: {
        _id: { type: 'string', description: 'ID do registro' },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'Estado do registro (draft após auto-save)',
        },
        draftAt: {
          type: 'string',
          format: 'date-time',
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
      description: 'Requisição inválida - Falha na validação de formato',
      type: 'object',
      properties: {
        message: { type: 'string' },
        code: { type: 'number', enum: [400] },
        cause: { type: 'string', enum: ['INVALID_PAYLOAD_FORMAT'] },
        errors: {
          type: 'object',
          description:
            'Erros de validação por campo. A chave é o slug do campo e o valor é a mensagem de erro.',
          additionalProperties: { type: 'string' },
        },
      },
    },
    401: buildErrorResponse(
      401,
      ['AUTHENTICATION_REQUIRED', 'USER_NOT_AUTHENTICATED'],
      {
        description: 'Não autorizado - Autenticação necessária',
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
      ],
      {
        description: 'Acesso negado - Sem permissão para criar registros',
      },
    ),
    404: buildErrorResponse(404, ['TABLE_NOT_FOUND', 'ROW_NOT_FOUND'], {
      description: 'Não encontrado - Tabela ou registro inexistente',
    }),
    500: buildErrorResponse(500, 'AUTO_SAVE_ROW_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
