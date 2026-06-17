/* eslint-disable no-unused-vars */
import type {
  E_ROLE,
  E_USER_STATUS,
  FindOptions,
  IUser,
  Merge,
  ValueOf,
} from '@application/core/entity.core';

export type UserCreatePayload = Merge<
  Pick<IUser, 'name' | 'email' | 'password'>,
  { group: string; status?: ValueOf<typeof E_USER_STATUS> }
>;

export type UserUpdatePayload = Merge<
  Merge<Pick<IUser, '_id'>, Partial<UserCreatePayload>>,
  {
    group?: string;
    status?: ValueOf<typeof E_USER_STATUS>;
    trashed?: boolean;
    trashedAt?: Date | null;
    notificationsEnabled?: boolean;
  }
>;

export type UserQueryPayload = {
  page?: number;
  perPage?: number;
  search?: string;
  user?: Merge<Pick<IUser, '_id'>, { role: ValueOf<typeof E_ROLE> }>;
  _ids?: string[];
  group?: string;
  status?: ValueOf<typeof E_USER_STATUS>;
  role?: ValueOf<typeof E_ROLE>;
  trashed?: boolean;
  sort?: Record<string, 'asc' | 'desc'>;
};

export type UserUpdateManyPayload = {
  _ids: string[];
  filterTrashed?: boolean;
  data: {
    trashed?: boolean;
    trashedAt?: Date | null;
    status?: ValueOf<typeof E_USER_STATUS>;
    group?: string;
  };
};

export abstract class UserContractRepository {
  abstract create(payload: UserCreatePayload): Promise<IUser>;
  abstract findById(_id: string, options?: FindOptions): Promise<IUser | null>;
  abstract findByEmail(
    email: string,
    options?: FindOptions,
  ): Promise<IUser | null>;
  abstract findMany(payload?: UserQueryPayload): Promise<IUser[]>;
  abstract findManyTrashed(): Promise<IUser[]>;
  abstract update(payload: UserUpdatePayload): Promise<IUser>;
  abstract updateMany(payload: UserUpdateManyPayload): Promise<number>;
  abstract delete(_id: string): Promise<void>;
  abstract deleteMany(_ids: string[]): Promise<number>;
  abstract count(payload?: UserQueryPayload): Promise<number>;
}
