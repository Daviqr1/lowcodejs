import { Service } from 'fastify-decorators';

import type { IMenu, IPermissionBinding } from '@application/core/entity.core';
import { E_PERMISSION_TARGET } from '@application/core/entity.core';

import { MenuVisibilityContractService } from './menu-visibility-contract.service';

@Service()
export default class MenuVisibilityService implements MenuVisibilityContractService {
  bindingAllows(
    visibility: IPermissionBinding | null | undefined,
    userGroupIds: Set<string>,
  ): boolean {
    if (!visibility) return true;
    if (visibility.kind === E_PERMISSION_TARGET.PUBLIC) return true;
    if (visibility.kind === E_PERMISSION_TARGET.NOBODY) return false;
    if (!visibility.group) return false;
    return userGroupIds.has(String(visibility.group));
  }

  isVisible(
    menu: IMenu,
    byId: Map<string, IMenu>,
    userGroupIds: Set<string>,
  ): boolean {
    // Guarda contra ciclo em `parent` — um menu corrompido nao pode travar o boot.
    const guard = new Set<string>();
    let current: IMenu | undefined = menu;

    while (current) {
      const currentId = String(current._id);
      if (guard.has(currentId)) break;
      guard.add(currentId);

      if (!this.bindingAllows(current.visibility, userGroupIds)) return false;

      if (!current.parent) break;
      current = byId.get(String(current.parent));
    }

    return true;
  }
}
