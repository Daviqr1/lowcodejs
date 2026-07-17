import { Service } from 'fastify-decorators';

import type { INotification, Paginated } from '@application/core/entity.core';
import { Notification as Model } from '@application/model/notification.model';

import type {
  NotificationContractRepository,
  NotificationCreatePayload,
  NotificationListPayload,
} from './notification-contract.repository';

@Service()
export default class NotificationMongooseRepository implements NotificationContractRepository {
  private transform(entity: InstanceType<typeof Model>): INotification {
    return {
      ...entity.toJSON({ flattenObjectIds: true }),
      _id: entity._id.toString(),
    };
  }

  async create(payload: NotificationCreatePayload): Promise<INotification> {
    const created = await Model.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      action: payload.action ?? null,
      source: payload.source ?? null,
      actorUserId: payload.actorUserId ?? null,
      read: false,
      readAt: null,
    });
    return this.transform(created);
  }

  async createMany(
    payloads: NotificationCreatePayload[],
  ): Promise<INotification[]> {
    if (payloads.length === 0) return [];
    const docs = await Model.insertMany(
      payloads.map((p) => ({
        userId: p.userId,
        type: p.type,
        title: p.title,
        body: p.body ?? null,
        action: p.action ?? null,
        source: p.source ?? null,
        actorUserId: p.actorUserId ?? null,
        read: false,
        readAt: null,
      })),
    );
    return docs.map((d) => this.transform(d));
  }

  async findById(_id: string): Promise<INotification | null> {
    const doc = await Model.findOne({ _id, trashed: false });
    if (!doc) return null;
    return this.transform(doc);
  }

  async paginatedByUser(
    payload: NotificationListPayload,
  ): Promise<Paginated<INotification>> {
    const where: Record<string, unknown> = {
      userId: payload.userId,
      trashed: false,
    };
    if (payload.unreadOnly) where.read = false;

    const total = await Model.countDocuments(where);
    const docs = await Model.find(where)
      .sort({ createdAt: -1 })
      .skip((payload.page - 1) * payload.perPage)
      .limit(payload.perPage);

    const lastPage = Math.max(1, Math.ceil(total / payload.perPage));

    return {
      data: docs.map((d) => this.transform(d)),
      meta: {
        total,
        page: payload.page,
        perPage: payload.perPage,
        lastPage,
        firstPage: 1,
      },
    };
  }

  async countUnread(userId: string): Promise<number> {
    return Model.countDocuments({ userId, read: false, trashed: false });
  }

  async markAsRead(_id: string, userId: string): Promise<INotification | null> {
    const doc = await Model.findOneAndUpdate(
      { _id, userId, trashed: false },
      { $set: { read: true, readAt: new Date() } },
      { new: true },
    );
    if (!doc) return null;
    return this.transform(doc);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await Model.updateMany(
      { userId, read: false, trashed: false },
      { $set: { read: true, readAt: new Date() } },
    );
    return result.modifiedCount;
  }

  async delete(_id: string, userId: string): Promise<boolean> {
    const result = await Model.updateOne(
      { _id, userId, trashed: false },
      { $set: { trashed: true, trashedAt: new Date() } },
    );
    return result.modifiedCount > 0;
  }
}
