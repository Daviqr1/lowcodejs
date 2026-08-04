import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Hook `onRequest` das rotas `/storage/*`: resolve o metadado do arquivo, monta
 * o `Content-Disposition` e serve o binario pelo driver indicado no proprio
 * documento (`location`), com fallback cruzado — necessario durante e depois da
 * migracao entre drivers, quando o arquivo pode estar no outro lado.
 */
export abstract class ContentDispositionHookContractService {
  abstract handle(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void | FastifyReply>;
}
