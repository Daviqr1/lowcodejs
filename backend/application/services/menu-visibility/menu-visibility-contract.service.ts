import type { IMenu, IPermissionBinding } from '@application/core/entity.core';

/**
 * Avaliacao do binding `visibility` de um menu e da sua cadeia de ancestrais.
 * Compartilhado entre a sidebar de menu e a exibicao de paginas, que precisam
 * aplicar exatamente a mesma regra.
 */
export abstract class MenuVisibilityContractService {
  /**
   * Binding ausente (menu legado) = visivel. PUBLIC visivel, NOBODY oculto,
   * GROUP visivel so para quem esta no grupo — o fecho transitivo ja vem
   * resolvido em `userGroupIds`.
   */
  abstract bindingAllows(
    visibility: IPermissionBinding | null | undefined,
    userGroupIds: Set<string>,
  ): boolean;

  /**
   * Visivel so quando o proprio menu e todos os ancestrais forem visiveis —
   * "pai oculto esconde a subarvore". `byId` mapeia _id para menu, para subir
   * a cadeia de `parent`.
   */
  abstract isVisible(
    menu: IMenu,
    byId: Map<string, IMenu>,
    userGroupIds: Set<string>,
  ): boolean;
}
