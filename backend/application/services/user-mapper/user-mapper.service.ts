import { Service } from 'fastify-decorators';

import type { IUser, Paginated } from '@application/core/entity.core';

import type { UserResponse } from './user-mapper-contract.service';
import { UserMapperContractService } from './user-mapper-contract.service';

@Service()
export default class UserMapperService implements UserMapperContractService {
  toResponse(user: IUser): UserResponse {
    const { password: _password, ...rest } = user;
    return rest;
  }

  toPaginatedResponse(paginated: Paginated<IUser>): Paginated<UserResponse> {
    return {
      ...paginated,
      data: paginated.data.map((user) => this.toResponse(user)),
    };
  }
}
