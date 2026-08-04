import { Service } from 'fastify-decorators';

import {
  E_NOTIFICATION_EVENT,
  type INotification,
} from '@application/core/entity.core';
import { NotificationContractRepository } from '@application/repositories/notification/notification-contract.repository';
import { NotificationSocketContractService } from '@application/services/notification-socket/notification-socket-contract.service';

import {
  NotificationContractService,
  type NotifyPayload,
} from './notification-contract.service';

@Service()
export default class NotificationService implements NotificationContractService {
  constructor(
    private readonly repository: NotificationContractRepository,
    private readonly notificationSocket: NotificationSocketContractService,
  ) {}

  async notify(payload: NotifyPayload): Promise<INotification[]> {
    const recipients = Array.from(
      new Set(
        payload.userIds.filter(
          (id) =>
            typeof id === 'string' &&
            id.length > 0 &&
            id !== payload.actorUserId,
        ),
      ),
    );

    if (recipients.length === 0) return [];

    try {
      const records = await this.repository.createMany(
        recipients.map((userId) => ({
          userId,
          type: payload.type,
          title: payload.title,
          body: payload.body ?? null,
          action: payload.action ?? null,
          source: payload.source ?? null,
          actorUserId: payload.actorUserId ?? null,
        })),
      );

      const namespace = this.notificationSocket.namespace();
      if (namespace) {
        for (const notification of records) {
          namespace
            .to(`user:${notification.userId}`)
            .emit(E_NOTIFICATION_EVENT.CREATED, notification);
        }
      }

      return records;
    } catch (error) {
      console.error('[notification.service] erro ao notificar:', error);
      return [];
    }
  }
}
