import type {
  E_NOTIFICATION_TYPE,
  INotification,
  INotificationAction,
  INotificationSource,
  ValueOf,
} from '@application/core/entity.core';

export type NotifyPayload = {
  userIds: string[];
  type: ValueOf<typeof E_NOTIFICATION_TYPE>;
  title: string;
  body?: string | null;
  action?: INotificationAction;
  source?: INotificationSource;
  actorUserId?: string | null;
};

export abstract class NotificationContractService {
  /**
   * Persiste uma notificação por usuário e emite o evento `notification:created`
   * no socket `/notifications` para os usuários que estiverem online.
   *
   * - `actorUserId`, quando informado, é excluído da lista de destinatários
   *   (usuário não notifica a si mesmo).
   * - É resiliente a falhas: erros são logados mas não propagados ao caller.
   */
  abstract notify(payload: NotifyPayload): Promise<INotification[]>;
}
