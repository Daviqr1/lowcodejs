import type {
  IPermissionBinding,
  ITable,
  IUser,
  ValueOf,
} from '@application/core/entity.core';
import type { E_TABLE_PERMISSION } from '@application/core/entity.core';

export type BindingCheck = {
  /** Fecho de grupos do usuario. */
  groupIds: Set<string>;
  /** Fecho de capacidades do usuario. */
  capabilities: Set<string>;
  /**
   * Capacidade exigida na intersecao do `GROUP`: nao basta estar no grupo, o
   * fecho tambem precisa conter esta capacidade. `null` pula a intersecao — e o
   * caso do menu, onde o binding e so visibilidade, nao permissao.
   */
  requiredCapability: string | null;
  /**
   * Resposta quando nao ha binding. As acoes de tabela negam (so libera o que
   * foi explicitamente concedido); campo e menu liberam (ausencia de binding e
   * a convencao de "visivel").
   */
  whenAbsent: boolean;
};

export type AccessCheckResult = {
  allowed: boolean;
  ownership?: {
    isOwner: boolean;
    isAdministrator: boolean;
    // Quando true, o acesso foi concedido a um convidado com perfil que so pode
    // agir sobre os proprios registros (perfil contributor). O use-case da row
    // deve comparar `row.creator` com o usuario antes de concluir update/remove.
    ownOnly?: boolean;
  };
};

export type AccessCheckInput = {
  table?: ITable;
  userId?: string;
  userRole?: string;
  user?: IUser | null;
  requiredPermission: ValueOf<typeof E_TABLE_PERMISSION>;
  httpMethod: string;
};

export abstract class PermissionContractService {
  /**
   * Verifica se o usuario tem a permissao necessaria no seu grupo
   */
  abstract checkUserHasPermission(
    user: IUser | null,
    permission: ValueOf<typeof E_TABLE_PERMISSION>,
  ): Promise<void>;

  /**
   * Verifica se o usuario esta ativo
   */
  abstract checkUserIsActive(user: IUser | null): Promise<void>;

  /**
   * Verifica se o acesso a tabela e publico (visitante sem auth)
   */
  abstract isPublicAccess(input: AccessCheckInput): boolean;

  /**
   * Verifica permissoes de acesso completas para usuario autenticado
   * Lanca HTTPException se nao autorizado
   */
  abstract checkTableAccess(
    input: AccessCheckInput,
  ): Promise<AccessCheckResult>;

  /**
   * Avalia um binding `{ kind, group }` ja com o fecho do usuario em maos.
   * PUBLIC libera; NOBODY nega; GROUP libera por intersecao (grupo no fecho E,
   * quando `requiredCapability` nao e nulo, a capacidade no fecho).
   *
   * Fonte unica: a mesma avaliacao existia em tres versoes — acao de tabela,
   * visibilidade de campo e visibilidade de menu — divergindo justamente no
   * default sem binding e na exigencia da capacidade. Os dois viraram parametro.
   */
  abstract bindingAllows(
    binding: IPermissionBinding | null | undefined,
    check: BindingCheck,
  ): boolean;
}
