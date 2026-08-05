import { buildErrorResponse } from '@application/core/schema.core';

/**
 * Saida da fatia `error-logs`.
 *
 * As duas rotas nao tinham `*.schema.ts`: ficavam fora do OpenAPI e sem
 * validacao de entrada na borda — so o `.parse()` do Zod dentro do controller,
 * cujo erro vira 400 generico em vez do 400 documentado.
 *
 * O Fastify remove da resposta o que nao estiver declarado aqui.
 */

const ERROR_LOG = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    statusCode: { type: 'number' },
    message: { type: 'string' },
    cause: { type: 'string', nullable: true },
    method: { type: 'string' },
    url: { type: 'string' },
    user: {
      type: 'object',
      nullable: true,
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
    errors: { type: 'object', additionalProperties: true, nullable: true },
    resolved: { type: 'boolean' },
    resolvedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const ErrorLogPaginatedResponse = {
  description: 'Lista paginada de registros de erro',
  type: 'object',
  properties: {
    data: { type: 'array', items: ERROR_LOG },
    meta: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        perPage: { type: 'number' },
        page: { type: 'number' },
        lastPage: { type: 'number' },
        firstPage: { type: 'number' },
      },
    },
  },
} as const;

export const ErrorLogResolveResponse = {
  description: 'Estado de resolução atualizado',
  type: 'object',
  properties: {
    id: { type: 'string' },
    resolved: { type: 'boolean' },
  },
} as const;

export const UnauthorizedResponse = buildErrorResponse(
  401,
  'AUTHENTICATION_REQUIRED',
  { description: 'Não autorizado - Autenticação necessária' },
);

/** `RoleMiddleware` guarda estas rotas para MASTER/ADMINISTRATOR. */
export const ForbiddenResponse = buildErrorResponse(403, 'FORBIDDEN', {
  description: 'Proibido - Exige MASTER ou ADMINISTRATOR',
});

export const InvalidPayloadResponse = buildErrorResponse(
  400,
  'INVALID_PAYLOAD_FORMAT',
  {
    description: 'Requisição inválida - Falha na validação',
    errorsDescription: 'Erros de validação por campo',
  },
);

export const serverErrorResponse = (
  cause: string,
): ReturnType<typeof buildErrorResponse> =>
  buildErrorResponse(500, cause, { description: 'Erro interno do servidor' });
