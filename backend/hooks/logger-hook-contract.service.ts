import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Hook `onResponse`: registra a acao do usuario no historico (Logger), com a
 * auditoria do registro referenciado resolvida a partir da propria ROW.
 */
export abstract class LoggerHookContractService {
  abstract handle(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void>;
}
