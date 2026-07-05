import { Service } from 'fastify-decorators';

import type { ITable, IUser, ValueOf } from '@application/core/entity.core';
import type { E_TABLE_PERMISSION } from '@application/core/entity.core';

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

@Service()
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
}
