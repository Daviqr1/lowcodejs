import { getInstanceByToken } from 'fastify-decorators';

import type {
  AuthOptions,
  RequestHook,
} from './authentication-middleware-contract.service';
import { AuthenticationMiddlewareContractService } from './authentication-middleware-contract.service';
import AuthenticationMiddlewareService from './authentication-middleware.service';

/**
 * Adaptador para o decorator de rota. O argumento de `@GET({ options: {
 * onRequest: [...] } })` e avaliado quando a classe do controller e decorada,
 * antes de existir instancia onde injetar — entao a resolucao acontece aqui.
 * A logica vive em `AuthenticationMiddlewareService`.
 */
export function AuthenticationMiddleware(options?: AuthOptions): RequestHook {
  return getInstanceByToken<AuthenticationMiddlewareContractService>(
    AuthenticationMiddlewareService,
  ).handle(options);
}
