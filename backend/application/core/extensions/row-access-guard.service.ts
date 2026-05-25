/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import { E_ROLE } from '@application/core/entity.core';
import type { IJWTPayload, IRow, ITable } from '@application/core/entity.core';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';

import { CreatorBypassGuard } from '../../../extensions/core/plugins/creator-bypass/guard';
import { DateWindowGuard } from '../../../extensions/core/plugins/date-window-guard/guard';
import { VisibilityByRoleGuard } from '../../../extensions/core/plugins/visibility-by-role/guard';

import type {
  GuardWriteDecision,
  RowAccessGuard,
} from './row-access-guard.contract';

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

  /**
   * @deprecated Use composeListQuery / composeReadDecision / composeWriteDecision / composeSanitize instead.
   */
  async getActiveGuardsFor(tableId: string): Promise<RowAccessGuard[]> {
    const extensions =
      await this.extensionRepository.findActiveForTable(tableId);
    return extensions
      .map((e) => GUARDS[`${e.pkg}:${e.extensionId}`])
      .filter((g): g is RowAccessGuard => Boolean(g));
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private bypassAdmin(user: IJWTPayload | undefined): boolean {
    return user?.role === E_ROLE.MASTER || user?.role === E_ROLE.ADMINISTRATOR;
  }

  private async getActiveGuardsWithSettings(
    tableId: string,
  ): Promise<
    Array<{ guard: RowAccessGuard; settings: Record<string, unknown> }>
  > {
    const extensions =
      await this.extensionRepository.findActiveForTable(tableId);
    const result: Array<{
      guard: RowAccessGuard;
      settings: Record<string, unknown>;
    }> = [];
    for (const ext of extensions) {
      const guard = GUARDS[`${ext.pkg}:${ext.extensionId}`];
      if (!guard) continue;
      const tableSettings = (ext as Record<string, unknown>)['tableSettings'];
      const settings: Record<string, unknown> =
        tableSettings &&
        typeof tableSettings === 'object' &&
        !Array.isArray(tableSettings)
          ? (((tableSettings as Record<string, unknown>)[tableId] as Record<
              string,
              unknown
            >) ?? {})
          : {};
      result.push({ guard, settings });
    }
    return result;
  }

  // ── Compose helpers ─────────────────────────────────────────────────────────

  /**
   * Composes the Mongo query with all active guards.
   * Admin bypass: returns baseQuery unchanged.
   * Restrictive guards contribute AND fragments.
   * Permissive guards contribute OR escapes.
   */
  async composeListQuery(
    tableId: string,
    baseQuery: Record<string, unknown>,
    user: IJWTPayload | undefined,
    table: ITable,
  ): Promise<Record<string, unknown>> {
    if (this.bypassAdmin(user)) return baseQuery;
    const active = await this.getActiveGuardsWithSettings(tableId);
    if (!active.length) return baseQuery;

    const restrictive: Record<string, unknown>[] = [];
    const permissive: Record<string, unknown>[] = [];

    for (const { guard, settings } of active) {
      const frag = guard.adjustListQuery({}, user, table, settings);
      if (Object.keys(frag).length === 0) continue; // sentinel: guard has nothing to contribute
      if (guard.category === 'restrictive') {
        restrictive.push(frag);
      } else {
        permissive.push(frag);
      }
    }

    const restrictedQuery: Record<string, unknown> = restrictive.length
      ? {
          ...baseQuery,
          $and: [...((baseQuery.$and as unknown[]) ?? []), ...restrictive],
        }
      : baseQuery;

    if (!permissive.length) return restrictedQuery;

    // permissive escapes the restrictive: (base AND restrictive) OR (base AND permissive[i])
    return {
      $or: [
        restrictedQuery,
        ...permissive.map((p) => ({ ...baseQuery, ...p })),
      ],
    };
  }

  /**
   * Compose canRead across all active guards.
   * Returns true if access is granted (allow > deny > abstain = true).
   */
  async composeReadDecision(
    tableId: string,
    row: IRow,
    user: IJWTPayload | undefined,
    table: ITable,
  ): Promise<boolean> {
    if (this.bypassAdmin(user)) return true;
    const active = await this.getActiveGuardsWithSettings(tableId);
    let sawDeny = false;
    for (const { guard, settings } of active) {
      const d = guard.canRead(row, user, table, settings);
      if (d === 'allow') return true; // permissive vence
      if (d === 'deny') sawDeny = true;
    }
    return !sawDeny; // só abstain = permitir
  }

  /**
   * Compose canWrite across all active guards.
   * allow > deny > abstain (abstain = allow by default).
   */
  async composeWriteDecision(
    tableId: string,
    row: IRow | null,
    user: IJWTPayload | undefined,
    table: ITable,
    payload: Record<string, unknown> | null,
    operation: 'create' | 'update' | 'delete',
  ): Promise<GuardWriteDecision> {
    if (this.bypassAdmin(user)) return { decision: 'allow' };
    const active = await this.getActiveGuardsWithSettings(tableId);
    let firstDeny: GuardWriteDecision | null = null;
    for (const { guard, settings } of active) {
      const d = guard.canWrite(row, user, table, payload, operation, settings);
      if (d.decision === 'allow') return { decision: 'allow' };
      if (d.decision === 'deny' && !firstDeny) firstDeny = d;
    }
    return firstDeny ?? { decision: 'allow' };
  }

  /**
   * Compose sanitizeWritePayload across all restrictive guards (stable order by pluginKey).
   * Admin bypass: returns payload unchanged.
   */
  async composeSanitize(
    tableId: string,
    payload: Record<string, unknown>,
    user: IJWTPayload | undefined,
    table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
  ): Promise<Record<string, unknown>> {
    if (this.bypassAdmin(user)) return payload;
    const active = await this.getActiveGuardsWithSettings(tableId);
    const restrictiveSorted = active
      .filter((a) => a.guard.category === 'restrictive')
      .sort((a, b) => a.guard.pluginKey.localeCompare(b.guard.pluginKey));
    let out = { ...payload };
    for (const { guard, settings } of restrictiveSorted) {
      out = guard.sanitizeWritePayload(
        out,
        user,
        table,
        operation,
        currentRow,
        settings,
      );
    }
    return out;
  }
}

RowAccessGuardService.register(
  VisibilityByRoleGuard.pluginKey,
  VisibilityByRoleGuard,
);
RowAccessGuardService.register(
  CreatorBypassGuard.pluginKey,
  CreatorBypassGuard,
);
RowAccessGuardService.register(DateWindowGuard.pluginKey, DateWindowGuard);
