/**
 * Hook Socket.IO para o feed de notificações em tempo real.
 *
 * Conecta no namespace `/notifications` autenticando via cookie JWT. Cada
 * evento dispara invalidação das queries de notificação e, opcionalmente,
 * um toast (quando o usuário tem `notificationsEnabled` true e não está na
 * página `/notifications`).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

import { queryKeys } from './tanstack-query/_query-keys';

import { E_NOTIFICATION_EVENT } from '@/lib/constant';
import type { INotification } from '@/lib/interfaces';

export function useNotificationsSocket(args: {
  baseUrl: string;
  enabled: boolean;
  visualEnabled: boolean;
}): { isConnected: boolean } {
  const { baseUrl, enabled, visualEnabled } = args;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const socketRef = useRef<Socket | null>(null);
  const visualEnabledRef = useRef(visualEnabled);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    visualEnabledRef.current = visualEnabled;
  }, [visualEnabled]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!enabled) return;
    if (!baseUrl) return;

    const socket = io(`${baseUrl}/notifications`, {
      withCredentials: true,
      path: '/socket.io',
    });
    socketRef.current = socket;

    socket.on(
      E_NOTIFICATION_EVENT.CREATED,
      (notification: INotification): void => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });

        const onNotificationsPage =
          pathnameRef.current.startsWith('/notifications');
        if (!visualEnabledRef.current) return;
        if (onNotificationsPage) return;

        const action = notification.action;
        let toastAction: { label: string; onClick: () => void } | undefined;
        if (action && action.href) {
          toastAction = {
            label: action.label ?? 'Abrir',
            onClick: (): void => {
              if (action.type === 'url') {
                window.location.href = action.href;
                return;
              }
              navigate({ to: action.href });
            },
          };
        }
        toast(notification.title, {
          description: notification.body ?? undefined,
          closeButton: true,
          action: toastAction,
        });
      },
    );

    socket.on(E_NOTIFICATION_EVENT.READ, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    socket.on(E_NOTIFICATION_EVENT.READ_ALL, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    });

    return (): void => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [baseUrl, enabled, queryClient, navigate]);

  return { isConnected: Boolean(socketRef.current?.connected) };
}
