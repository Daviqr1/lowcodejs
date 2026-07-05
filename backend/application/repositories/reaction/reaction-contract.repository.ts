import type {
  E_REACTION_TYPE,
  FindOptions,
  IReaction,
  Merge,
  ValueOf,
} from '@application/core/entity.core';

export type ReactionCreatePayload = Merge<
  Pick<IReaction, 'type'>,
  { user: string }
>;

export type ReactionUpdatePayload = Merge<
  Pick<IReaction, '_id'>,
  Partial<ReactionCreatePayload>
>;

export type ReactionQueryPayload = {
  page?: number;
  perPage?: number;
  user?: string;
  type?: ValueOf<typeof E_REACTION_TYPE>;
};

export abstract class ReactionContractRepository {
  abstract create(payload: ReactionCreatePayload): Promise<IReaction>;
  abstract findByIdAndUser(
    _id: string,
    user: string,
    options?: FindOptions,
  ): Promise<IReaction | null>;
  abstract findMany(payload?: ReactionQueryPayload): Promise<IReaction[]>;
  abstract update(payload: ReactionUpdatePayload): Promise<IReaction>;
  abstract delete(_id: string): Promise<void>;
  abstract count(payload?: ReactionQueryPayload): Promise<number>;
}
