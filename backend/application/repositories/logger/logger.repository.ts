import { Service } from 'fastify-decorators';

import type { FindOptions, ILogger } from '@application/core/entity.core';
import { Logger as Model } from '@application/model/logger.model';
import { QueryBuilderContractService } from '@application/services/table/query-builder-contract.service';

import {
  LoggerContractRepository,
  LoggerCreatePayload,
  LoggerQueryPayload,
  LoggerUpdatePayload,
} from './logger-contract.repository';

@Service()
export default class LoggerMongooseRepository implements LoggerContractRepository {
  constructor(private readonly query: QueryBuilderContractService) {}

  private readonly populateOptions = [
    { path: 'user' },
    { path: 'creator' },
    { path: 'updater' },
  ];

  private buildWhereClause(
    payload?: LoggerQueryPayload,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (payload?.user_id) {
      where.user = payload.user_id;
    }

    if (payload?.actions && payload.actions.length > 0) {
      where.action = { $in: payload.actions };
    }

    if (payload?.objects && payload.objects.length > 0) {
      where.object = { $in: payload.objects };
    }

    if (payload?.dateFrom || payload?.dateTo) {
      const range: Record<string, Date> = {};
      if (payload.dateFrom) range.$gte = payload.dateFrom;
      if (payload.dateTo) range.$lte = payload.dateTo;
      where.createdAt = range;
    }

    if (payload?.search) {
      const term = this.query.normalize(payload.search);
      where.$or = [
        { url: { $regex: term, $options: 'i' } },
        { object_id: { $regex: term, $options: 'i' } },
        { action: { $regex: term, $options: 'i' } },
        { object: { $regex: term, $options: 'i' } },
      ];
    }

    return where;
  }

  private transform(entity: InstanceType<typeof Model>): ILogger {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: LoggerCreatePayload): Promise<ILogger> {
    const {
      user_id,
      creator,
      updater,
      objectCreatedAt,
      objectUpdatedAt,
      ...rest
    } = payload;
    const created = await Model.create({
      ...rest,
      user: user_id ?? null,
      creator: creator ?? null,
      updater: updater ?? null,
      objectCreatedAt: objectCreatedAt ?? null,
      objectUpdatedAt: objectUpdatedAt ?? null,
    });
    const populated = await created.populate(this.populateOptions);
    return this.transform(populated);
  }

  async findById(_id: string, options?: FindOptions): Promise<ILogger | null> {
    const where: Record<string, unknown> = { _id };

    if (options?.trashed !== undefined) {
      where.trashed = options.trashed;
    }

    const logger = await Model.findOne(where).populate(this.populateOptions);

    if (!logger) return null;

    return this.transform(logger);
  }

  async findMany(payload?: LoggerQueryPayload): Promise<ILogger[]> {
    const where = this.buildWhereClause(payload);

    let skip: number | undefined;
    let take: number | undefined;

    if (payload?.page && payload?.perPage) {
      skip = (payload.page - 1) * payload.perPage;
      take = payload.perPage;
    }

    let sortOption: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' };
    if (payload?.sort && Object.keys(payload.sort).length > 0) {
      sortOption = payload.sort;
    }

    const loggers = await Model.find(where)
      .populate(this.populateOptions)
      .sort(sortOption)
      .skip(skip ?? 0)
      .limit(take ?? 0);

    return loggers.map((entity) => this.transform(entity));
  }

  async update({ _id, ...payload }: LoggerUpdatePayload): Promise<ILogger> {
    const logger = await Model.findOne({ _id });

    if (!logger) throw new Error('logger not found');

    const { user_id, ...rest } = payload;
    logger.set({
      ...rest,
      ...(user_id !== undefined && { user: user_id }),
    });

    await logger.save();

    const populated = await logger.populate(this.populateOptions);

    return this.transform(populated);
  }

  async count(payload?: LoggerQueryPayload): Promise<number> {
    const where = this.buildWhereClause(payload);
    return Model.countDocuments(where);
  }
}
