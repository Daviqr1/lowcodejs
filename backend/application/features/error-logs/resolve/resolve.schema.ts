import type { FastifySchema } from 'fastify';

import {
  buildErrorResponse,
  zodToRouteSchema,
} from '@application/core/schema.core';

import {
  ErrorLogResolveResponse,
  ForbiddenResponse,
  InvalidPayloadResponse,
  serverErrorResponse,
  UnauthorizedResponse,
} from '../_shared.response';
import {
  ErrorLogResolveBodyValidator,
  ErrorLogResolveParamsValidator,
} from '../_shared.validator';

export const ErrorLogResolveSchema: FastifySchema = {
  tags: ['Histórico de erros'],
  summary: 'Marcar registro de erro como resolvido',
  security: [{ cookieAuth: [] }],
  params: zodToRouteSchema(ErrorLogResolveParamsValidator),
  body: zodToRouteSchema(ErrorLogResolveBodyValidator),
  response: {
    200: ErrorLogResolveResponse,
    400: InvalidPayloadResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: buildErrorResponse(404, 'ERROR_LOG_NOT_FOUND', {
      description: 'Registro de erro não encontrado',
    }),
    500: serverErrorResponse('RESOLVE_ERROR_LOG_ERROR'),
  },
};
