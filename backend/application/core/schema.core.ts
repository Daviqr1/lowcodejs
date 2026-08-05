/**
 * Blocos de erro dos `*.schema.ts` (documentacao OpenAPI). Sao valores de
 * escopo de modulo, avaliados no import junto com o proprio schema — o que
 * variava entre as copias era so `description`, a mensagem e a lista de
 * `cause`.
 *
 * `errors` precisa estar declarado em todo bloco: o Fastify remove da resposta
 * qualquer propriedade fora do schema, e os controllers propagam `errors`.
 */

type ErrorResponseSchema = {
  description: string;
  type: 'object';
  properties: {
    message: { type: 'string'; enum?: string[]; description?: string };
    code: { type: 'number'; enum: number[] };
    cause: { type: 'string'; enum: string[] };
    errors: {
      type: 'object';
      additionalProperties: { type: 'string' };
      description?: string;
    };
  };
};

export const buildErrorResponse = (
  code: number,
  cause: string | string[],
  options: {
    description: string;
    message?: string | string[];
    /** So quando o schema original documentava o campo. */
    messageDescription?: string;
    errorsDescription?: string;
  },
): ErrorResponseSchema => {
  const causes = [cause].flat();
  const messages = [options.message ?? []].flat();

  const message: ErrorResponseSchema['properties']['message'] = {
    type: 'string',
  };
  if (messages.length > 0) message.enum = messages;
  if (options.messageDescription)
    message.description = options.messageDescription;

  const errors: ErrorResponseSchema['properties']['errors'] = {
    type: 'object',
    additionalProperties: { type: 'string' },
  };
  if (options.errorsDescription) errors.description = options.errorsDescription;

  return {
    description: options.description,
    type: 'object',
    properties: {
      message,
      code: { type: 'number', enum: [code] },
      cause: { type: 'string', enum: causes },
      errors,
    },
  };
};

/** 401 do `AuthenticationMiddleware` — identico em 129 rotas. */
export const UnauthorizedResponse = buildErrorResponse(
  401,
  'AUTHENTICATION_REQUIRED',
  {
    description: 'Não autorizado - Autenticação necessária',
    message: 'Autenticação necessária',
  },
);
