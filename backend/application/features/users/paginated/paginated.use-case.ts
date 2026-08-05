import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import type { Paginated } from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import { HttpResponseContractService } from '@application/services/http-response/http-response-contract.service';
import type { UserResponse } from '@application/services/user-mapper/user-mapper-contract.service';
import { UserMapperContractService } from '@application/services/user-mapper/user-mapper-contract.service';

import type { UserPaginatedPayload } from '../_shared.validator';

type Response = Either<HTTPException, Paginated<UserResponse>>;
type Payload = UserPaginatedPayload;

@Service()
export default class UserPaginatedUseCase {
  constructor(
    private readonly userRepository: UserContractRepository,
    private readonly http: HttpResponseContractService,
    private readonly userMapper: UserMapperContractService,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      const sort: Record<string, 'asc' | 'desc'> = {};
      if (payload['order-name']) sort.name = payload['order-name'];
      if (payload['order-email']) sort.email = payload['order-email'];
      if (payload['order-group']) sort['group.name'] = payload['order-group'];
      if (payload['order-status']) sort.status = payload['order-status'];
      if (payload['order-created-at'])
        sort.createdAt = payload['order-created-at'];

      const users = await this.userRepository.findMany({ ...payload, sort });

      const total = await this.userRepository.count(payload);

      const meta = this.http.paginationMeta(total, payload);

      return right(this.userMapper.toPaginatedResponse({ meta, data: users }));
    } catch (error) {
      console.error('[users > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_USER_PAGINATED_ERROR',
        ),
      );
    }
  }
}
