import type { FastifyRequest } from 'fastify';

export type AuthOptions = {
  /** Rota publica: sem token segue adiante, com token popula `request.user`. */
  optional?: boolean;
};

export type RequestHook = (request: FastifyRequest) => Promise<void>;

/** Le o access token do cookie, valida e popula `request.user`. */
export abstract class AuthenticationMiddlewareContractService {
  abstract handle(options?: AuthOptions): RequestHook;
}
