import type {
  E_ROLE,
  FindOptions,
  IGroup,
  IUser,
  Merge,
  ValueOf,
} from '@application/core/entity.core';

export type UserGroupCreatePayload = Merge<
  Pick<IGroup, 'name' | 'slug'>,
  {
    description?: string | null;
    permissions: string[];
    // Ids dos grupos englobados. Opcional: grupos sem hierarquia ficam [].
    encompasses?: string[];
  }
>;

export type UserGroupUpdatePayload = Merge<
  Pick<IGroup, '_id'>,
  Merge<
    Partial<UserGroupCreatePayload>,
    {
      trashed?: boolean;
      trashedAt?: Date | null;
    }
  >
>;

export type UserGroupQueryPayload = {
  page?: number;
  perPage?: number;
  search?: string;
  user?: Merge<Pick<IUser, '_id'>, { role: ValueOf<typeof E_ROLE> }>;
  // Oculta o grupo MASTER da listagem. Resolvido pelo use-case via fecho de
  // grupos do ator (privilegiado, porem nao MASTER) — nao mais pelo role do JWT.
  hideMaster?: boolean;
  trashed?: boolean;
  sort?: Record<string, 'asc' | 'desc'>;
};

export type UserGroupUpdateManyPayload = {
  _ids: string[];
  filterTrashed?: boolean;
  data: {
    trashed?: boolean;
    trashedAt?: Date | null;
  };
};

export abstract class UserGroupContractRepository {
  abstract create(payload: UserGroupCreatePayload): Promise<IGroup>;
  abstract findById(_id: string, options?: FindOptions): Promise<IGroup | null>;
  abstract findBySlug(
    slug: string,
    options?: FindOptions,
  ): Promise<IGroup | null>;
  abstract findMany(payload?: UserGroupQueryPayload): Promise<IGroup[]>;
  abstract findManyTrashed(): Promise<IGroup[]>;
  abstract update(payload: UserGroupUpdatePayload): Promise<IGroup>;
  abstract updateMany(payload: UserGroupUpdateManyPayload): Promise<number>;
  abstract delete(_id: string): Promise<void>;
  abstract deleteMany(_ids: string[]): Promise<number>;
  abstract count(payload?: UserGroupQueryPayload): Promise<number>;
}
