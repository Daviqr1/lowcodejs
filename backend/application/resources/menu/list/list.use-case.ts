import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IMenu as Entity,
  ITable,
  IUser,
  ValueOf,
} from '@application/core/entity.core';
import {
  E_MENU_ITEM_TYPE,
  E_TABLE_PERMISSION,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { MenuVisibility } from '@application/core/menu-visibility.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import { PermissionContractService } from '@application/services/permission/permission-contract.service';

type Response = Either<HTTPException, Entity[]>;

type Payload = {
  actorUserId?: string;
  role?: string;
};

// Permissao de tabela exigida por tipo de menu que aponta para tabela:
// uma opcao "tabela" (lista) usa o VIEW da tabela; um "formulario" usa o
// CREATE_ROW (quem pode submeter o formulario ve a opcao).
const TABLE_LINKED_PERMISSION: Record<
  string,
  ValueOf<typeof E_TABLE_PERMISSION>
> = {
  [E_MENU_ITEM_TYPE.TABLE]: E_TABLE_PERMISSION.VIEW_TABLE,
  [E_MENU_ITEM_TYPE.FORM]: E_TABLE_PERMISSION.CREATE_ROW,
};

@Service()
export default class MenuListUseCase {
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly tableRepository: TableContractRepository,
    private readonly permissionService: PermissionContractService,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  // Menu do tipo TABLE/FORM só aparece se o usuário tem a permissão da tabela
  // vinculada (lista usa VIEW; formulário usa CREATE_ROW). Tabela inexistente
  // ou na lixeira oculta a opção. Reaproveita o enforcement do PermissionService.
  private async canAccessLinkedTable(
    menu: Entity,
    tablesById: Map<string, ITable>,
    payload: Payload,
    user: IUser | null,
  ): Promise<boolean> {
    const requiredPermission = TABLE_LINKED_PERMISSION[menu.type];
    if (!requiredPermission) return true;
    if (!menu.table) return true;

    const table = tablesById.get(String(menu.table));
    if (!table) return false;

    try {
      await this.permissionService.checkTableAccess({
        table,
        userId: payload.actorUserId,
        userRole: payload.role,
        user,
        requiredPermission,
        httpMethod: 'GET',
      });
      return true;
    } catch {
      // Qualquer negativa de acesso (Forbidden/Unauthorized) oculta a opção.
      return false;
    }
  }

  private async loadLinkedTables(
    menus: Entity[],
  ): Promise<Map<string, ITable>> {
    const tableIds = new Set<string>();
    for (const menu of menus) {
      if (!TABLE_LINKED_PERMISSION[menu.type]) continue;
      if (!menu.table) continue;
      tableIds.add(String(menu.table));
    }

    const tablesById = new Map<string, ITable>();
    if (tableIds.size === 0) return tablesById;

    // Carregar tabelas vinculadas nao pode derrubar o feed da sidebar: uma
    // referencia/populate quebrada degrada para "sem acesso" (oculta a opcao),
    // nunca em 500 no login.
    try {
      const tables = await this.tableRepository.findMany({
        _ids: Array.from(tableIds),
        trashed: false,
      });
      for (const table of tables) tablesById.set(String(table._id), table);
    } catch (error) {
      console.error('[menu > list][loadLinkedTables][error]:', error);
    }

    return tablesById;
  }

  async execute(payload: Payload = {}): Promise<Response> {
    try {
      const menus = await this.menuRepository.findMany({
        trashed: false,
        sort: { order: 'asc', name: 'asc' },
      });

      let user: IUser | null = null;
      if (payload.actorUserId) {
        user = await this.userRepository.findById(payload.actorUserId);
      }

      // Privilegiado (MASTER/ADMINISTRATOR no fecho de grupos — nao apenas no
      // grupo principal) enxerga todos os menus.
      if (await this.groupResolver.isPrivileged(user)) {
        return right(menus);
      }

      const userGroupIds = await this.groupResolver.resolveUserGroupIds(user);

      const byId = new Map<string, Entity>();
      for (const menu of menus) byId.set(String(menu._id), menu);

      const tablesById = await this.loadLinkedTables(menus);

      // Cache por tabela: uma mesma tabela referenciada por vários menus é
      // avaliada uma única vez.
      const tableAccessCache = new Map<string, boolean>();
      const visible: Entity[] = [];

      for (const menu of menus) {
        if (!MenuVisibility.isVisible(menu, byId, userGroupIds)) continue;

        const requiredPermission = TABLE_LINKED_PERMISSION[menu.type];
        if (requiredPermission && menu.table) {
          const cacheKey = `${String(menu.table)}:${requiredPermission}`;
          let canAccess = tableAccessCache.get(cacheKey);
          if (canAccess === undefined) {
            canAccess = await this.canAccessLinkedTable(
              menu,
              tablesById,
              payload,
              user,
            );
            tableAccessCache.set(cacheKey, canAccess);
          }
          if (!canAccess) continue;
        }

        visible.push(menu);
      }

      return right(visible);
    } catch (error) {
      console.error('[menu > list][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_MENU_ERROR',
        ),
      );
    }
  }
}
