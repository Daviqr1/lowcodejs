import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { BellOff, Check, CheckCheck, Trash2 } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { PageHeader, PageShell } from '@/components/common/page-shell';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotificationDelete } from '@/hooks/tanstack-query/use-notification-delete';
import { useNotificationMarkAllAsRead } from '@/hooks/tanstack-query/use-notification-mark-all-as-read';
import { useNotificationMarkAsRead } from '@/hooks/tanstack-query/use-notification-mark-as-read';
import { useNotificationPaginated } from '@/hooks/tanstack-query/use-notification-paginated';
import { formatDate } from '@/lib/format-date';
import type { INotification } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

export const Route = createLazyFileRoute('/_private/notifications/')({
  component: NotificationsPage,
});

type Tab = 'all' | 'unread';

function NotificationsPage(): React.JSX.Element {
  const [tab, setTab] = React.useState<Tab>('all');
  const [page, setPage] = React.useState(1);

  const list = useNotificationPaginated({
    page,
    perPage: 20,
    unreadOnly: tab === 'unread',
  });

  const markAsRead = useNotificationMarkAsRead();
  const markAllAsRead = useNotificationMarkAllAsRead({
    onSuccess(data) {
      toast.success('Notificações marcadas', {
        description: `${data.updated} notificações foram marcadas como lidas.`,
      });
    },
  });
  const deleteNotification = useNotificationDelete();
  const navigate = useNavigate();

  function handleOpen(notification: INotification): void {
    if (!notification.read) {
      markAsRead.mutate({ _id: notification._id });
    }
    if (notification.action && notification.action.href) {
      const action = notification.action;
      if (action.type === 'url') {
        window.location.href = action.href;
      } else {
        navigate({ to: action.href });
      }
    }
  }

  return (
    <PageShell data-test-id="notifications-page">
      <PageShell.Header>
        <PageHeader title="Notificações">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="size-4 mr-1" />
            Marcar todas como lidas
          </Button>
        </PageHeader>
      </PageShell.Header>

      <PageShell.Content>
        <div className="flex flex-col gap-4 p-4">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              if (value === 'all' || value === 'unread') setTab(value);
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">Não lidas</TabsTrigger>
            </TabsList>
          </Tabs>

          {list.isPending && (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          )}

          {list.isSuccess && list.data.data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <BellOff className="size-8" />
              <p className="text-sm">Sem notificações por aqui.</p>
            </div>
          )}

          {list.isSuccess && list.data.data.length > 0 && (
            <ul className="flex flex-col gap-2">
              {list.data.data.map((notification) => (
                <li
                  key={notification._id}
                  className={cn(
                    'border rounded-md px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors',
                    !notification.read && 'bg-accent/30 border-primary/30',
                  )}
                >
                  {!notification.read && (
                    <span
                      aria-label="Não lida"
                      className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0"
                    />
                  )}
                  {notification.read && (
                    <Check
                      aria-label="Lida"
                      className="mt-1 h-4 w-4 text-muted-foreground shrink-0"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpen(notification)}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <p
                      className={cn(
                        'text-sm',
                        notification.read &&
                          'font-normal text-muted-foreground',
                        !notification.read && 'font-medium',
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {formatDate(notification.createdAt)}
                    </p>
                  </button>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!notification.read && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer"
                        title="Marcar como lida"
                        onClick={() =>
                          markAsRead.mutate({ _id: notification._id })
                        }
                      >
                        <CheckCheck className="size-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer"
                      title="Remover"
                      onClick={() =>
                        deleteNotification.mutate({ _id: notification._id })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {list.isSuccess && list.data.meta.lastPage > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Página {list.data.meta.page} de {list.data.meta.lastPage}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= list.data.meta.lastPage}
                  onClick={() =>
                    setPage((p) => Math.min(list.data.meta.lastPage, p + 1))
                  }
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageShell.Content>
    </PageShell>
  );
}
