import type { FastifySchema } from 'fastify';

import { E_ERROR_CODE } from '@application/core/error-code.core';
import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import { RegisterIpParamsValidator } from './_shared.validator';

/**
 * A rota nao tinha schema: ficava fora do OpenAPI e sem validacao na borda.
 */
export const RegisterIpSchema: FastifySchema = {
  tags: ['Registrar IP'],
  summary: 'Grava o IP do solicitante no registro',
  description:
    'Resolve o IP do cliente (X-Forwarded-For, com fallback para request.ip) e grava no campo configurado da row.',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(RegisterIpParamsValidator),
  response: {
    200: {
      description: 'IP registrado',
      type: 'object',
      properties: { ip: { type: 'string' } },
    },
    401: buildErrorResponse(401, E_ERROR_CODE.AUTHENTICATION_REQUIRED, {
      description: 'Não autorizado - Autenticação necessária',
    }),
    403: buildErrorResponse(403, E_ERROR_CODE.FORBIDDEN, {
      description: 'Proibido - Sem permissão de escrita na tabela',
    }),
    404: buildErrorResponse(
      404,
      [
        E_ERROR_CODE.TABLE_NOT_FOUND,
        E_ERROR_CODE.ROW_NOT_FOUND,
        'EXTENSION_NOT_ACTIVE',
      ],
      { description: 'Tabela, registro ou extensão não encontrados' },
    ),
    500: buildErrorResponse(500, 'REGISTER_IP_ERROR', {
      description: 'Erro interno do servidor',
    }),
  },
};
