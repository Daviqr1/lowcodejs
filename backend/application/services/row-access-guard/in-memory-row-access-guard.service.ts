/**
 * Stub permissivo de RowAccessGuardContractService para testes unitários.
 * Sem guards registrados — todos os métodos liberam (sem restrição), permitindo
 * testar os use-cases sem infra de extensões. Implementa o contrato, então é
 * atribuível onde o contrato é injetado (sem casts).
 */
import type {
  GuardEvalContext,
  GuardWriteDecision,
} from '@application/core/extensions/row-access-guard.contract';

import { RowAccessGuardContractService } from './row-access-guard-contract.service';

export class InMemoryRowAccessGuardService extends RowAccessGuardContractService {
  async resolveContext(userId: string | undefined): Promise<GuardEvalContext> {
    return {
      user: undefined,
      userId,
      groupIds: new Set<string>(),
      isPrivileged: false,
    };
  }

  async composeListQuery(
    _tableId: string,
    baseQuery: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return baseQuery;
  }

  async composeReadDecision(): Promise<boolean> {
    return true;
  }

  async composeWriteDecision(): Promise<GuardWriteDecision> {
    return { decision: 'allow' };
  }

  async composeSanitize(
    _tableId: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return payload;
  }
}
