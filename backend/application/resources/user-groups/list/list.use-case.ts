import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type {
  E_ROLE,
  IGroup as Entity,
  IUser,
  Merge,
  ValueOf,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { UserGroupContractRepository } from '@application/repositories/user-group/user-group-contract.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';

type Response = Either<HTTPException, Entity[]>;
type Payload = {
  user?: Merge<Pick<IUser, '_id'>, { role: ValueOf<typeof E_ROLE> }>;
};

@Service()
export default class UserGroupListUseCase {
  constructor(
    private readonly userGroupRepository: UserGroupContractRepository,
    private readonly userRepository: UserContractRepository,
    private readonly groupResolver: GroupResolverContractService,
  ) {}

  async execute(payload?: Payload): Promise<Response> {
    try {
      let actor: IUser | null = null;
      if (payload?.user?._id) {
        actor = await this.userRepository.findById(payload.user._id);
      }
      const hideMaster = await this.groupResolver.shouldHideMaster(actor);

      const groups = await this.userGroupRepository.findMany({ hideMaster });

      return right(groups);
    } catch (error) {
      console.error('[user-groups > list][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_USER_GROUP_ERROR',
        ),
      );
    }
  }
}
