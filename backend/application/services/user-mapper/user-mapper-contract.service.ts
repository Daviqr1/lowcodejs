import type { IUser, Paginated } from '@application/core/entity.core';

export type UserResponse = Omit<IUser, 'password'>;

/** Remove o hash de senha antes de o usuario sair pela API. */
export abstract class UserMapperContractService {
  abstract toResponse(user: IUser): UserResponse;
  abstract toPaginatedResponse(
    paginated: Paginated<IUser>,
  ): Paginated<UserResponse>;
}
