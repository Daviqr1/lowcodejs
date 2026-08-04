import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';

export const NOTIFICATIONS_NAMESPACE = '/notifications';

/**
 * Namespace `/notifications`: feed em tempo real por usuario. Cada socket
 * autenticado entra na room `user:<sub>`, onde o `NotificationService` emite.
 *
 * Eventos (server -> client): `notification:created`, `notification:read`,
 * `notification:read_all`.
 */
export abstract class NotificationSocketContractService {
  abstract init(io: SocketIOServer, decode: JwtDecoder): Namespace;

  /** `null` enquanto o namespace nao subiu (ex.: contexto sem HTTP server). */
  abstract namespace(): Namespace | null;
}
