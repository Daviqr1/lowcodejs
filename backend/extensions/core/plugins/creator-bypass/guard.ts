/**
 * CreatorBypassGuard — plugin permissivo que concede acesso de leitura/escrita
 * ao criador de um registro, independentemente do que outros guards decidiriam.
 *
 * NOTE: Admin bypass (MASTER / ADMINISTRATOR) é aplicado GLOBALMENTE pelo
 * RowAccessGuardService antes de invocar qualquer guard. Este guard pode assumir
 * que user?.role NUNCA será MASTER ou ADMINISTRATOR.
 *
 * Categoria: permissive — emite 'allow' quando criador === user.sub, fazendo
 * bypass de guards restrictive (ex: visibility-by-role) que normalmente
 * bloqueariam o acesso. Quando não há match, retorna 'abstain'.
 *
 * Sem DI deps — o campo `creator` é nativo de IRow e sempre presente.
 * Sem settings — nada a configurar por tabela.
 */
import { right } from '@application/core/either.core';
import type { Either } from '@application/core/either.core';
import type { IJWTPayload, IRow, ITable } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import type {
  GuardAccessDecision,
  GuardBindResult,
  GuardWriteDecision,
  RowAccessGuard,
} from '@application/core/extensions/row-access-guard.contract';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLUGIN_KEY = 'core:creator-bypass';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifica se o campo `creator` da row bate com o `sub` do usuário logado.
 * `creator` é um campo nativo do IRow (string com o userId).
 */
function rowCreatorMatchesUser(
  row: { creator?: unknown } | null | undefined,
  user: IJWTPayload | undefined,
): boolean {
  if (!row || typeof row.creator !== 'string' || !row.creator) return false;
  if (!user?.sub) return false;
  return row.creator === user.sub;
}

// ── Guard ─────────────────────────────────────────────────────────────────────

export const CreatorBypassGuard: RowAccessGuard = {
  pluginKey: PLUGIN_KEY,
  category: 'permissive',
  supportsScopeAll: true,
  settingsSchema: undefined,

  async onTableBound(
    _table: ITable,
    _settings: Record<string, unknown>,
  ): Promise<Either<HTTPException, GuardBindResult>> {
    // Sem setup necessário — creator é campo nativo, sempre existe.
    return right({ wasCreated: false });
  },

  /**
   * Contribui com fragmento { creator: user.sub } ao $or permissive do service.
   * Se user não está autenticado, retorna {} (sentinel = "nada a contribuir").
   * O service filtra fragmentos vazios antes de incluir no $or.
   */
  adjustListQuery(
    _query: Record<string, unknown>,
    user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!user?.sub) return {};
    return { creator: user.sub };
  },

  /**
   * Permite leitura se o usuário é o criador. Abstém se não.
   * Emitir 'allow' faz bypass de qualquer 'deny' emitido por guards restrictive.
   */
  canRead(
    row: IRow,
    user: IJWTPayload | undefined,
    _table: ITable,
    _settings: Record<string, unknown>,
  ): GuardAccessDecision {
    return rowCreatorMatchesUser(row as { creator?: unknown }, user)
      ? 'allow'
      : 'abstain';
  },

  /**
   * create: sempre abstain — não há row ainda para verificar ownership.
   * update/delete: allow se usuário é o criador, abstain se não é.
   */
  canWrite(
    currentRow: IRow | null,
    user: IJWTPayload | undefined,
    _table: ITable,
    _payload: Record<string, unknown> | null,
    operation: 'create' | 'update' | 'delete',
    _settings: Record<string, unknown>,
  ): GuardWriteDecision {
    if (operation === 'create') return { decision: 'abstain' };
    return rowCreatorMatchesUser(
      currentRow as { creator?: unknown } | null,
      user,
    )
      ? { decision: 'allow' }
      : { decision: 'abstain' };
  },

  /**
   * Guards permissivos não sanitizam payload — retorna identity.
   * Sanitize é responsabilidade exclusiva de guards restrictive.
   */
  sanitizeWritePayload(
    payload: Record<string, unknown>,
    _user: IJWTPayload | undefined,
    _table: ITable,
    _operation: 'create' | 'update',
    _currentRow: IRow | null,
    _settings: Record<string, unknown>,
  ): Record<string, unknown> {
    return payload;
  },
};

export { PLUGIN_KEY as CREATOR_BYPASS_PLUGIN_KEY };
