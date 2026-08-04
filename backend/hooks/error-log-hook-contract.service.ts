import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Hook `onSend`: registra no "Historico de erros" toda resposta com status
 * >= 400 (exceto 401), de usuario autenticado. Captura inclusive os erros que
 * os use-cases devolvem via Either — esses nao sao lancados, entao nao passam
 * pelo error handler do kernel. Best-effort: nao atrasa nem quebra a resposta.
 */
export abstract class ErrorLogHookContractService {
  abstract handle(
    request: FastifyRequest,
    response: FastifyReply,
    payload: unknown,
  ): Promise<unknown>;
}
