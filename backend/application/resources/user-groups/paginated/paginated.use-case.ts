import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  IGroup as Entity,
  IUser,
  Paginated,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import { HttpResponseContractService } from '@application/services/http-response/http-response-contract.service';

import type { UserGroupPaginatedPayload } from './paginated.validator';

type Response = Either<HTTPException, Paginated<Entity>>;
type Payload = UserGroupPaginatedPayload;

@Service()
export default class UserGroupPaginatedUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
    private readonly http: HttpResponseContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const sort: Record<string, 'asc' | 'desc'> = {};
      if (payload['order-name']) sort.name = payload['order-name'];
      if (payload['order-description'])
        sort.description = payload['order-description'];
      if (payload['order-created-at'])
        sort.createdAt = payload['order-created-at'];

      let actor: IUser | null = null;
      if (payload.user?._id) {
        actor = await this.userRepository.findById(payload.user._id);
      }
      const hideMaster = await this.groupResolver.shouldHideMaster(actor);

      const groups = await this.userGroupRepository.findMany({
        page: payload.page,
        perPage: payload.perPage,
        search: payload.search,
        trashed: payload.trashed,
        hideMaster,
        sort,
      });

      const total = await this.userGroupRepository.count({
        search: payload.search,
        trashed: payload.trashed,
        hideMaster,
      });

      const meta = this.http.paginationMeta(total, payload);

      return right({
        meta,
        data: groups,
      });
    } catch (error) {
      console.error('[user-groups > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_USER_GROUP_PAGINATED_ERROR',
        ),
      );
    }
  }
}
