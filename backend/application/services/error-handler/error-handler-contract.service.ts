import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Error handler global do kernel. Ordem de tratamento: HTTPException, ZodError,
 * FST_ERR_VALIDATION (AJV) e, por fim, 500 generico.
 */
export abstract class ErrorHandlerContractService {
  abstract handle(
    error: unknown,
    request: FastifyRequest,
    response: FastifyReply,
  ): FastifyReply;
}
