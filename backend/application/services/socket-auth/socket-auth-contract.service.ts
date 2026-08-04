import type { Namespace } from 'socket.io';

import type { IJWTPayload } from '@application/core/entity.core';

/** Decodifica e valida o access token. Fornecido pelo kernel (fastify-jwt). */
export type JwtDecoder = (value: string) => IJWTPayload | null;

/**
 * Autenticacao de namespace Socket.IO. Os cinco namespaces do backend repetiam
 * o mesmo esqueleto: ler o cookie do handshake, decodificar o token, conferir
 * que e do tipo ACCESS e pendurar o payload em `socket.data.user`.
 */
export type SocketAuthOptions = {
  /**
   * Exige privilegio MASTER pelo **fecho de grupos** (principal + adicionais
   * + englobados), nao pelo `role` do JWT — consistente com o RoleMiddleware.
   */
  requireMaster?: boolean;
};

export abstract class SocketAuthContractService {
  /** Instala o middleware de autenticacao no namespace. */
  abstract protect(
    namespace: Namespace,
    decode: JwtDecoder,
    options?: SocketAuthOptions,
  ): void;
}
