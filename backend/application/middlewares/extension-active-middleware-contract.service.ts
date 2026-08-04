import type { E_EXTENSION_TYPE, ValueOf } from '@application/core/entity.core';

import type { RequestHook } from './authentication-middleware-contract.service';

export type ExtensionActiveOptions = {
  pkg: string;
  type: ValueOf<typeof E_EXTENSION_TYPE>;
  extensionId: string;
};

/**
 * Garante que a extensao esta habilitada e disponivel, blindando rotas
 * registradas por extensoes mesmo quando a flag e desligada em runtime.
 */
export abstract class ExtensionActiveMiddlewareContractService {
  abstract handle(options: ExtensionActiveOptions): RequestHook;
}
