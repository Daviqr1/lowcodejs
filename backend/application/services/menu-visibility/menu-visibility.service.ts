import { Service } from 'fastify-decorators';

import type { IMenu, IPermissionBinding } from '@application/core/entity.core';
import { PermissionContractService } from '@application/services/permission/permission-contract.service';

import { MenuVisibilityContractService } from './menu-visibility-contract.service';

@Service()
export default class MenuVisibilityService implements MenuVisibilityContractService {
  constructor(private readonly permission: PermissionContractService) {}

  /**
   * Menu sem binding e visivel. GROUP aqui **nao** passa pela intersecao com
   * capacidade: o binding do menu e visibilidade de navegacao, nao permissao de
   * acao — quem entra na rota ainda enfrenta a guarda do recurso.
   */
  bindingAllows(
    visibility: IPermissionBinding | null | undefined,
    userGroupIds: Set<string>,
  ): boolean {
    return this.permission.bindingAllows(visibility, {
      groupIds: userGroupIds,
      capabilities: new Set(),
      requiredCapability: null,
      whenAbsent: true,
    });
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
