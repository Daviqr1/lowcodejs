import { Service } from 'fastify-decorators';

import type { IRow, ITable, ValueOf } from '@application/core/entity.core';
import { E_ROLE } from '@application/core/entity.core';
import type {
  GuardEvalContext,
  GuardWriteDecision,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';
import { ExtensionContractRepository } from '@application/repositories/extension/extension-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import { RowAccessControlGuard } from '@extensions/core/plugins/row-access/guard';

import { RowAccessGuardContractService } from './row-access-guard-contract.service';

const GUARDS: Record<string, RowAccessGuard> = {};

function isRole(value: string): value is ValueOf<typeof E_ROLE> {
  return (
    value === E_ROLE.MASTER ||
    value === E_ROLE.ADMINISTRATOR ||
    value === E_ROLE.MANAGER ||
    value === E_ROLE.REGISTERED
  );
}

// user.group é o grupo principal (legacy compat para JWT). Pode ser string
// (slug/role) ou objeto — só vira role quando bate com um E_ROLE válido.
function resolveRole(group: unknown): ValueOf<typeof E_ROLE> {
  if (typeof group === 'string' && isRole(group)) return group;
  return E_ROLE.REGISTERED;
}

@Service()
export default class RowAccessGuardService extends RowAccessGuardContractService {
  constructor(
    private readonly extensionRepository: ExtensionContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
    private readonly rowAccessGuard: RowAccessControlGuard,
  ) {
    super();
    RowAccessGuardService.register(
      this.rowAccessGuard.pluginKey,
      this.rowAccessGuard,
    );
  }

  static register(key: string, guard: RowAccessGuard): void {
    GUARDS[key] = guard;
  }

  static getRegistered(): Record<string, RowAccessGuard> {
    return GUARDS;
  }

  // ── Context resolution ─────────────────────────────────────────────────────

  /**
   * Resolve o GuardEvalContext para um userId dado.
   * Se userId for undefined (visitante), retorna contexto vazio sem privilégio.
   */
  async resolveContext(userId: string | undefined): Promise<GuardEvalContext> {
    if (!userId) {
      return {
        user: undefined,
        userId: undefined,
        groupIds: new Set<string>(),
        isPrivileged: false,
      };
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return {
        user: undefined,
        userId,
        groupIds: new Set<string>(),
        isPrivileged: false,
      };
    }

    const groupIds = await this.groupResolver.resolveUserGroupIds(user);
    const isPrivileged = await this.groupResolver.isPrivileged(user);

    return {
      user: {
        sub: user._id,
        email: user.email,
        role: resolveRole(user.group),
        type: 'ACCESS',
      },
      userId,
      groupIds,
      isPrivileged,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private extractTableSettings(
    extension: { tableSettings: Record<string, Record<string, unknown>> },
    tableId: string,
  ): Record<string, unknown> {
    return extension.tableSettings[tableId] ?? {};
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
      const settings = this.extractTableSettings(ext, tableId);
      // Guard sem suporte a scope-all NÃO enforça via binding mode='all'
      // (ex.: core:row-access auto-ativado no boot com o default 'all' porém
      // nunca vinculado a uma tabela). Só enforça quando vinculado
      // explicitamente via tableScope.mode='specific' (feito pelo bulk-configure).
      if (!guard.supportsScopeAll && ext.tableScope.mode === 'all') continue;
      result.push({ guard, settings });
    }
    return result;
  }

  // ── Compose helpers ─────────────────────────────────────────────────────────

  /**
   * Compõe a query Mongo com todos os guards ativos.
   * Bypass de privilegiado: retorna baseQuery inalterada.
   * Restrictive guards contribuem fragmentos AND.
   * Permissive guards contribuem escapes OR.
   */
  async composeListQuery(
    tableId: string,
    baseQuery: Record<string, unknown>,
    ctx: GuardEvalContext,
    table: ITable,
  ): Promise<Record<string, unknown>> {
    if (ctx.isPrivileged) return baseQuery;
    const active = await this.getActiveGuardsWithSettings(tableId);
    if (!active.length) return baseQuery;

    const restrictive: Record<string, unknown>[] = [];
    const permissive: Record<string, unknown>[] = [];

    for (const { guard, settings } of active) {
      const frag = guard.adjustListQuery({}, ctx, table, settings);
      if (Object.keys(frag).length === 0) continue; // sentinel: guard não tem nada a contribuir
      if (guard.category === 'restrictive') {
        restrictive.push(frag);
      } else {
        permissive.push(frag);
      }
    }

    const restrictedQuery = this.buildRestrictedQuery(baseQuery, restrictive);

    if (!permissive.length) return restrictedQuery;

    // permissive escapa o restrictive: (base AND restrictive) OR (base AND permissive[i])
    return {
      $or: [
        restrictedQuery,
        ...permissive.map((p) => ({ ...baseQuery, ...p })),
      ],
    };
  }

  private buildRestrictedQuery(
    baseQuery: Record<string, unknown>,
    restrictive: Record<string, unknown>[],
  ): Record<string, unknown> {
    if (!restrictive.length) return baseQuery;
    const existingAnd: unknown[] = [];
    if (Array.isArray(baseQuery.$and)) existingAnd.push(...baseQuery.$and);
    return {
      ...baseQuery,
      $and: [...existingAnd, ...restrictive],
    };
  }

  /**
   * Compõe canRead entre todos os guards ativos.
   * Retorna true se o acesso é permitido (allow > deny > abstain = true).
   */
  async composeReadDecision(
    tableId: string,
    row: IRow,
    ctx: GuardEvalContext,
    table: ITable,
  ): Promise<boolean> {
    if (ctx.isPrivileged) return true;
    const active = await this.getActiveGuardsWithSettings(tableId);
    let sawDeny = false;
    for (const { guard, settings } of active) {
      const d = guard.canRead(row, ctx, table, settings);
      if (d === 'allow') return true; // permissive vence
      if (d === 'deny') sawDeny = true;
    }
    return !sawDeny; // só abstain = permitir
  }

  /**
   * Compõe canWrite entre todos os guards ativos.
   * allow > deny > abstain (abstain = allow por padrão).
   */
  async composeWriteDecision(
    tableId: string,
    row: IRow | null,
    ctx: GuardEvalContext,
    table: ITable,
    payload: Record<string, unknown> | null,
    operation: 'create' | 'update' | 'delete',
  ): Promise<GuardWriteDecision> {
    if (ctx.isPrivileged) return { decision: 'allow' };
    const active = await this.getActiveGuardsWithSettings(tableId);
    let firstDeny: GuardWriteDecision | null = null;
    for (const { guard, settings } of active) {
      const d = guard.canWrite(row, ctx, table, payload, operation, settings);
      if (d.decision === 'allow') return { decision: 'allow' };
      if (d.decision === 'deny' && !firstDeny) firstDeny = d;
    }
    return firstDeny ?? { decision: 'allow' };
  }

  /**
   * Compõe sanitizeWritePayload entre todos os guards restrictive (ordem estável por pluginKey).
   * Bypass de privilegiado: retorna payload inalterado.
   */
  async composeSanitize(
    tableId: string,
    payload: Record<string, unknown>,
    ctx: GuardEvalContext,
    table: ITable,
    operation: 'create' | 'update',
    currentRow: IRow | null,
  ): Promise<Record<string, unknown>> {
    if (ctx.isPrivileged) return payload;
    const active = await this.getActiveGuardsWithSettings(tableId);
    const restrictiveSorted = active
      .filter((a) => a.guard.category === 'restrictive')
      .sort((a, b) => a.guard.pluginKey.localeCompare(b.guard.pluginKey));
    let out = { ...payload };
    for (const { guard, settings } of restrictiveSorted) {
      out = guard.sanitizeWritePayload(
        out,
        ctx,
        table,
        operation,
        currentRow,
        settings,
      );
    }
    return out;
  }
}
