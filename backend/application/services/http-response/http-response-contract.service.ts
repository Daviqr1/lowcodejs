import type { FastifyReply } from 'fastify';

import type HTTPException from '@application/core/exception.core';

export abstract class HttpResponseContractService {
  /**
   * Envelope unico de erro dos controllers: `status` vem do proprio
   * `HTTPException.code`. `errors` so entra quando existe — os schemas de
   * resposta que nao declaram o campo o descartam na serializacao.
   */
  abstract sendError(response: FastifyReply, error: HTTPException): void;
}
