import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { IMenu, IUser, Merge } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { MenuContractRepository } from '@application/repositories/menu/menu-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import { MenuVisibilityContractService } from '@application/services/menu-visibility/menu-visibility-contract.service';

import type { PageShowPayload } from '../_shared.validator';

type Response = Either<HTTPException, IMenu>;
type Payload = Merge<
  PageShowPayload,
  {
    actorUserId?: string;
    role?: string;
  }
>;

@Service()
export default class PageShowUseCase {
  constructor(
    private readonly menuRepository: MenuContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
    private readonly menuVisibility: MenuVisibilityContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const menu = await this.menuRepository.findBySlug(payload.slug, {
        trashed: false,
      });

      if (!menu)
        return left(
          HTTPException.NotFound('Página não encontrada', 'PAGE_NOT_FOUND'),
        );

      const hasAccess = await this.canSeePage(menu, payload);

      // Acesso negado responde como inexistente: nao vaza a existencia da pagina
      // para quem nao pode ve-la.
      if (!hasAccess)
        return left(
          HTTPException.NotFound('Página não encontrada', 'PAGE_NOT_FOUND'),
        );

      return right(menu);
    } catch (error) {
      console.error('[pages > show][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'GET_MENU_ERROR',
        ),
      );
    }
  }

  // Aplica o mesmo enforcement de visibilidade do feed da sidebar
  // (`menu/list`): binding `visibility` da pagina e de toda a cadeia de
  // ancestrais. Privilegiado (MASTER/ADMINISTRATOR no fecho de grupos) enxerga
  // tudo.
  private async canSeePage(menu: IMenu, payload: Payload): Promise<boolean> {
    let user: IUser | null = null;
    if (payload.actorUserId) {
      user = await this.userRepository.findById(payload.actorUserId);
    }

    if (await this.groupResolver.isPrivileged(user)) return true;

    const userGroupIds = await this.groupResolver.resolveUserGroupIds(user);

    const menus = await this.menuRepository.findMany({ trashed: false });
    const byId = new Map<string, IMenu>();
    for (const item of menus) byId.set(String(item._id), item);

    return this.menuVisibility.isVisible(menu, byId, userGroupIds);
  }
}
