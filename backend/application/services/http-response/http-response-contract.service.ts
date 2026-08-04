import type { FastifyReply } from 'fastify';

import type { IMeta } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

export abstract class HttpResponseContractService {
  /**
   * Envelope unico de erro dos controllers: `status` vem do proprio
   * `HTTPException.code`. `errors` so entra quando existe — os schemas de
   * resposta que nao declaram o campo o descartam na serializacao.
   */
  abstract sendError(response: FastifyReply, error: HTTPException): void;

  /**
   * Bloco `meta` das listagens paginadas, montado igual em 9 use-cases.
   *
   * `lastPage` nunca e zero: lista vazia devolve `1`, senao a resposta ficaria
   * com `page: 1` maior que `lastPage: 0` (o front ja compensava isso na mao em
   * `pagination.tsx`). `firstPage` continua `0` quando nao ha resultado.
   */
  abstract paginationMeta(
    total: number,
    payload: { page: number; perPage: number },
  ): IMeta;
}
