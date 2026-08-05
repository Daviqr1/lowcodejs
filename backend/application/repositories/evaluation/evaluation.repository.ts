import { Service } from 'fastify-decorators';

import type { IEvaluation } from '@application/core/entity.core';
import type { FindOptions } from '@application/core/entity.core';
import { Evaluation as Model } from '@application/model/evaluation.model';
import { MongooseRepository } from '@application/repositories/mongoose-base.repository';

import type {
  EvaluationContractRepository,
  EvaluationCreatePayload,
  EvaluationQueryPayload,
  EvaluationUpdatePayload,
} from './evaluation-contract.repository';

@Service()
export default class EvaluationMongooseRepository
  extends MongooseRepository<IEvaluation>
  implements EvaluationContractRepository
{
  private readonly populateOptions = [{ path: 'user' }];

  private buildWhereClause(
    payload?: EvaluationQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.user) where.user = payload.user;

    return where;
  }

  async create(payload: EvaluationCreatePayload): Promise<IEvaluation> {
    const created = await Model.create(payload);
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findByIdAndUser(
    _id: string,
    user: string,
    options?: FindOptions,
  ): Promise<IEvaluation | null> {
    const where = this.trashedClause({ _id, user }, options, false);

    const evaluation = await Model.findOne(where).populate(
      this.populateOptions,
    );
    if (!evaluation) return null;

    return this.transform(evaluation);
  }

  async findMany(payload?: EvaluationQueryPayload): Promise<IEvaluation[]> {
    const where = this.buildWhereClause(payload);

    const { skip, limit } = this.paginate(payload);

    const evaluations = await Model.find(where)
      .populate(this.populateOptions)
      .sort({ createdAt: 'desc' })
      .skip(skip)
      .limit(limit);

    return evaluations.map((e) => this.transform(e));
  }

  async update({
    _id,
    ...payload
  }: EvaluationUpdatePayload): Promise<IEvaluation> {
    const evaluation = await Model.findOne({ _id });

    if (!evaluation) throw new Error('Evaluation not found');

    evaluation.set(payload);

    await evaluation.save();

    const populated = await evaluation.populate(this.populateOptions);

    return this.transform(populated);
  }

  async delete(_id: string): Promise<void> {
    await Model.deleteOne({ _id });
  }

  async count(payload?: EvaluationQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }
}
