/**
 * Socket.IO namespace `/notifications`.
 *
 * Feed em tempo real de notificações por usuário. Cada socket autenticado
 * entra automaticamente na room `user:<sub>` — o `NotificationService` emite
 * eventos `notification:created` na room do destinatário.
 *
 * Eventos (server → client):
 *   - notification:created  INotification
 *   - notification:read     { _id: string }
 *   - notification:read_all { userId: string }
 */

import type { Namespace, Server as SocketIOServer } from 'socket.io';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import { ACCESS_TOKEN_COOKIE } from '@application/utils/cookies.util';

export const NOTIFICATIONS_NAMESPACE = '/notifications';

let notificationsNamespace: Namespace | null = null;

export function getNotificationsNamespace(): Namespace | null {
  return notificationsNamespace;
}

function extractCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  let lastValue: string | undefined;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      lastValue = rest.join('=');
    }
  }
  return lastValue;
}

export function initNotificationsSocket(
  io: SocketIOServer,
  jwtDecode: (value: string) => IJWTPayload | null,
): Namespace {
  const namespace = io.of(NOTIFICATIONS_NAMESPACE);

  namespace.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const accessToken = extractCookieValue(cookieHeader, ACCESS_TOKEN_COOKIE);

    if (!accessToken) {
      next(new Error('Autenticação necessária.'));
      return;
    }

    const decoded = jwtDecode(accessToken);
    if (!decoded || decoded.type !== E_JWT_TYPE.ACCESS) {
      next(new Error('Token inválido.'));
      return;
    }

    socket.data.user = decoded;
    next();
  });

  namespace.on('connection', (socket) => {
    const userId: string = socket.data.user?.sub ?? '';
    if (userId) socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      // Sem cleanup adicional — Socket.IO remove o socket das rooms automaticamente.
    });
  });

  notificationsNamespace = namespace;
  return namespace;
}
