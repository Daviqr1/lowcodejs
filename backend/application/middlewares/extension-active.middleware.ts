import { getInstanceByToken } from 'fastify-decorators';

import type { RequestHook } from './authentication-middleware-contract.service';
import type { ExtensionActiveOptions } from './extension-active-middleware-contract.service';
import { ExtensionActiveMiddlewareContractService } from './extension-active-middleware-contract.service';
import ExtensionActiveMiddlewareService from './extension-active-middleware.service';

/** Adaptador para o decorator de rota — ver `authentication.middleware.ts`. */
export function ExtensionActiveMiddleware(
  options: ExtensionActiveOptions,
): RequestHook {
  return getInstanceByToken<ExtensionActiveMiddlewareContractService>(
    ExtensionActiveMiddlewareService,
  ).handle(options);
}
