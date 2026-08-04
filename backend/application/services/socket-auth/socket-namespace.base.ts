import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from './socket-auth-contract.service';

/**
 * Base dos services de namespace Socket.IO. Os tres repetiam o mesmo
 * `private current` + `init()` que guarda o namespace + getter `namespace()`
 * byte-a-byte igual — o que muda e o nome do namespace, a blindagem de auth e
 * os handlers de conexao, tudo dentro de `create()`.
 *
 * Nao e um par contract+impl: o contrato de cada namespace vive no proprio
 * dominio (`NotificationSocketContractService`, etc.).
 */
export abstract class SocketNamespaceBase {
  private current: Namespace | null = null;

  /** Abre o namespace, protege e registra os handlers proprios. */
  protected abstract create(io: SocketIOServer, decode: JwtDecoder): Namespace;

  init(io: SocketIOServer, decode: JwtDecoder): Namespace {
    this.current = this.create(io, decode);
    return this.current;
  }

  namespace(): Namespace | null {
    return this.current;
  }
}
