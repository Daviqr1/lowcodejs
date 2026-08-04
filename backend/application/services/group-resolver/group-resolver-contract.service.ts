import type { IUser } from '@application/core/entity.core';
import type { IGroup } from '@application/core/entity.core';

export abstract class GroupResolverContractService {
  /**
   * `true` quando atribuir `encompasses` a `groupId` fecharia um ciclo. Quem
   * pertence a um grupo herda o acesso de tudo que ele engloba (fecho
   * transitivo), entao a hierarquia precisa ser um DAG.
   */
  abstract hasCycle(
    groupId: string,
    encompasses: string[],
    groups: Array<Pick<IGroup, '_id' | 'encompasses'>>,
  ): boolean;

  /**
   * Conjunto de ids de grupos que o usuario satisfaz: o fecho transitivo de
   * `{group} ∪ groups` seguindo `encompasses`. Usado para decidir se um binding
   * de acao (GROUP) e atendido.
   */
  abstract resolveUserGroupIds(user: IUser | null): Promise<Set<string>>;

  /**
   * Uniao das permissoes (slugs) de todos os grupos do fecho do usuario. Usado
   * pelas capacidades de area (MANAGE_USERS, MANAGE_MENU, etc.) e pelas
   * permissoes de tabela herdadas do grupo.
   */
  abstract resolveCapabilities(user: IUser | null): Promise<Set<string>>;

  /**
   * `true` se o usuario e privilegiado: algum grupo do fecho (`{group} ∪ groups`
   * seguindo `encompasses`) tem slug MASTER ou ADMINISTRATOR. Fonte unica de
   * verdade para os atalhos de "acesso total" — substitui as comparacoes
   * espalhadas `role === E_ROLE.MASTER/ADMINISTRATOR`, que enxergavam apenas o
   * grupo principal (singular) e ignoravam grupos adicionais/englobados.
   */
  abstract isPrivileged(user: IUser | null): Promise<boolean>;

  /**
   * `true` se o usuario e MASTER pelo fecho de grupos (`{group} ∪ groups`
   * seguindo `encompasses`). Diferente de `isPrivileged` (MASTER ou
   * ADMINISTRATOR): usado nas decisoes restritas a MASTER (bypass de capacidade
   * de area, protecao de trash de outro MASTER, ocultar o grupo MASTER de
   * administradores). Substitui as comparacoes `role === E_ROLE.MASTER`, que
   * enxergavam apenas o grupo principal.
   */
  abstract isMaster(user: IUser | null): Promise<boolean>;

  /**
   * `true` quando o ator e privilegiado (MASTER ou ADMINISTRATOR pelo fecho)
   * porem **nao** e MASTER — caso em que o grupo/usuarios MASTER devem ser
   * ocultados das listagens administrativas. Substitui o filtro baseado em
   * `role === ADMINISTRATOR` dos repositorios.
   */
  abstract shouldHideMaster(user: IUser | null): Promise<boolean>;
}
