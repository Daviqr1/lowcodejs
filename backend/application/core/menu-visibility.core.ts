import type { IMenu, IPermissionBinding } from './entity.core';
import { E_PERMISSION_TARGET } from './entity.core';

/**
 * Avaliacao do binding `visibility` de um menu (e da sua cadeia de ancestrais).
 * Compartilhado entre a listagem de menu (sidebar) e a exibicao de paginas, que
 * precisam aplicar exatamente a mesma regra de visibilidade.
 */
export class MenuVisibility {
  /**
   * Binding ausente (menu legado) = visivel. PUBLIC visivel, NOBODY oculto,
   * GROUP visivel so para quem esta no grupo (fecho transitivo ja resolvido em
   * `userGroupIds`).
   */
  static bindingAllows(
    visibility: IPermissionBinding | null | undefined,
    userGroupIds: Set<string>,
  ): boolean {
    if (!visibility) return true;
    if (visibility.kind === E_PERMISSION_TARGET.PUBLIC) return true;
    if (visibility.kind === E_PERMISSION_TARGET.NOBODY) return false;
    if (!visibility.group) return false;
    return userGroupIds.has(String(visibility.group));
  }

  /**
   * Visivel so se o proprio menu e todos os ancestrais forem visiveis ("pai
   * oculto esconde a subarvore"). `byId` mapeia _id -> menu para subir a cadeia
   * de `parent`.
   */
  static isVisible(
    menu: IMenu,
    byId: Map<string, IMenu>,
    userGroupIds: Set<string>,
  ): boolean {
    const guard = new Set<string>();
    let current: IMenu | undefined = menu;

    while (current) {
      const currentId = String(current._id);
      if (guard.has(currentId)) break;
      guard.add(currentId);

      if (!MenuVisibility.bindingAllows(current.visibility, userGroupIds))
        return false;

      if (!current.parent) break;
      current = byId.get(String(current.parent));
    }

    return true;
  }
}
