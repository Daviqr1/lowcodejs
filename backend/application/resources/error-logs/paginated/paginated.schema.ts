import type { FastifySchema } from 'fastify';

import { zodToRouteSchema } from '@application/core/schema.core';

import {
  ErrorLogPaginatedResponse,
  ForbiddenResponse,
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import { ErrorLogPaginatedQueryValidator } from '../_shared.validator';

export const ErrorLogPaginatedSchema: FastifySchema = {
  tags: ['Histórico de erros'],
  summary: 'Listar registros de erro com paginação',
  description:
    'Lista os erros capturados pelo hook de resposta, com filtro por status, período e estado de resolução',
  security: [{ cookieAuth: [] }],
  querystring: zodToRouteSchema(ErrorLogPaginatedQueryValidator),
  response: {
    200: ErrorLogPaginatedResponse,
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    500: serverErrorResponse('LIST_ERROR_LOGS_ERROR'),
  },
};
