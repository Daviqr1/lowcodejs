import { Link, getRouteApi, useNavigate } from '@tanstack/react-router';
import { Bell, Check, CheckCheck } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useNotificationMarkAllAsRead } from '@/hooks/tanstack-query/use-notification-mark-all-as-read';
import { useNotificationMarkAsRead } from '@/hooks/tanstack-query/use-notification-mark-as-read';
import { useNotificationPaginated } from '@/hooks/tanstack-query/use-notification-paginated';
import { useNotificationUnreadCount } from '@/hooks/tanstack-query/use-notification-unread-count';
import { useProfileRead } from '@/hooks/tanstack-query/use-profile-read';
import { useNotificationsSocket } from '@/hooks/use-notifications-socket';
import type { INotification } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

const rootApi = getRouteApi('__root__');

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return date.toLocaleDateString('pt-BR');
}

export function NotificationBell(): React.JSX.Element {
  const { baseUrl } = rootApi.useLoaderData();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const profile = useProfileRead();
  const isAuthenticated = profile.status === 'success';
  // Default ligado: usuários antigos não têm o campo no DB, então undefined também é true.
  let visualEnabled = false;
  if (profile.status === 'success') {
    visualEnabled = profile.data.notificationsEnabled !== false;
  }

  useNotificationsSocket({
    baseUrl,
    enabled: isAuthenticated,
    visualEnabled,
  });

  const unreadCount = useNotificationUnreadCount(isAuthenticated);
  const list = useNotificationPaginated({ page: 1, perPage: 3 });
  const markAsRead = useNotificationMarkAsRead();
  const markAllAsRead = useNotificationMarkAllAsRead();

  const total = unreadCount.data?.count ?? 0;

  function handleClick(notification: INotification): void {
    if (!notification.read) {
      markAsRead.mutate({ _id: notification._id });
    }
    if (notification.action && notification.action.href) {
      const href = notification.action.href;
      if (notification.action.type === 'url') {
        window.location.href = href;
      } else {
        navigate({ to: href });
      }
    }
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          data-test-id="notification-bell"
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 cursor-pointer"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none"
            >
              {total > 99 && '99+'}
              {total <= 99 && total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs cursor-pointer"
            disabled={markAllAsRead.isPending}
            onClick={() => markAllAsRead.mutate()}
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Marcar todas
          </Button>
        </div>
        <Separator />
        <ScrollArea className="max-h-80">
          {list.isPending && (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          )}
          {list.isSuccess && list.data.data.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              Nenhuma notificação por aqui.
            </div>
          )}
          {list.isSuccess && list.data.data.length > 0 && (
            <ul className="divide-y">
              {list.data.data.map((notification) => (
                <li
                  key={notification._id}
                  className={cn(
                    'flex items-start gap-1 px-2 py-1 hover:bg-accent transition-colors',
                    !notification.read && 'bg-accent/40',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleClick(notification)}
                    className="flex-1 min-w-0 text-left px-1 py-1 cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <span
                          aria-label="Não lida"
                          className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0"
                        />
                      )}
                      {notification.read && (
                        <Check
                          aria-label="Lida"
                          className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm leading-tight',
                            notification.read &&
                              'font-normal text-muted-foreground',
                            !notification.read && 'font-medium',
                          )}
                        >
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                  {!notification.read && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 cursor-pointer"
                      aria-label="Marcar como lida"
                      title="Marcar como lida"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead.mutate({ _id: notification._id });
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <Separator />
        <div className="px-3 py-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs cursor-pointer"
            onClick={() => setOpen(false)}
          >
            <Link to="/notifications">Ver todas</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
