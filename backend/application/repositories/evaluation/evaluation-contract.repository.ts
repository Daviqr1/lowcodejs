import type {
  FindOptions,
  IEvaluation,
  Merge,
} from '@application/core/entity.core';

export type EvaluationCreatePayload = Merge<
  Pick<IEvaluation, 'value'>,
  { user: string }
>;

export type EvaluationUpdatePayload = Merge<
  Pick<IEvaluation, '_id'>,
  Partial<EvaluationCreatePayload>
>;

export type EvaluationQueryPayload = {
  page?: number;
  perPage?: number;
  user?: string;
};

export abstract class EvaluationContractRepository {
  abstract create(payload: EvaluationCreatePayload): Promise<IEvaluation>;
  abstract findByIdAndUser(
    _id: string,
    user: string,
    options?: FindOptions,
  ): Promise<IEvaluation | null>;
  abstract findMany(payload?: EvaluationQueryPayload): Promise<IEvaluation[]>;
  abstract update(payload: EvaluationUpdatePayload): Promise<IEvaluation>;
  abstract delete(_id: string): Promise<void>;
  abstract count(payload?: EvaluationQueryPayload): Promise<number>;
}
