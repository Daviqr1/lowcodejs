/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { RowAccessGuard } from './row-access-guard.contract';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

const GUARDS: Record<string, RowAccessGuard> = {};

@Service()
export class RowAccessGuardService {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
  ) {}

  static register(key: string, guard: RowAccessGuard): void {
    GUARDS[key] = guard;
  }

  static getRegistered(): Record<string, RowAccessGuard> {
    return GUARDS;
  }

  async getActiveGuardsFor(tableId: string): Promise<RowAccessGuard[]> {
    const extensions = await this.extensionRepository.findActiveForTable(
      tableId,
    );
    return extensions
      .map((e) => GUARDS[`${e.pkg}:${e.extensionId}`])
      .filter((g): g is RowAccessGuard => Boolean(g));
  }
}
