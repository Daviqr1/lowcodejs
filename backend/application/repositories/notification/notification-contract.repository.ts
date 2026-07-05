import type {
  INotification,
  INotificationAction,
  INotificationSource,
  Paginated,
  ValueOf,
  E_NOTIFICATION_TYPE,
} from '@application/core/entity.core';

export type NotificationType = ValueOf<typeof E_NOTIFICATION_TYPE>;

export type NotificationCreatePayload = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  action?: INotificationAction;
  source?: INotificationSource;
  actorUserId?: string | null;
};

export type NotificationListPayload = {
  userId: string;
  page: number;
  perPage: number;
  unreadOnly?: boolean;
};

export abstract class NotificationContractRepository {
  abstract create(payload: NotificationCreatePayload): Promise<INotification>;
  abstract createMany(
    payloads: NotificationCreatePayload[],
  ): Promise<INotification[]>;
  abstract findById(_id: string): Promise<INotification | null>;
  abstract paginatedByUser(
    payload: NotificationListPayload,
  ): Promise<Paginated<INotification>>;
  abstract countUnread(userId: string): Promise<number>;
  abstract markAsRead(
    _id: string,
    userId: string,
  ): Promise<INotification | null>;
  abstract markAllAsRead(userId: string): Promise<number>;
  abstract delete(_id: string, userId: string): Promise<boolean>;
}
