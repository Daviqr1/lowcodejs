import { Service } from 'fastify-decorators';
import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';
import { SocketAuthContractService } from '@application/services/socket-auth/socket-auth-contract.service';

import {
  STORAGE_MIGRATION_NAMESPACE,
  StorageMigrationSocketContractService,
} from './storage-migration-socket-contract.service';

@Service()
export default class StorageMigrationSocketService implements StorageMigrationSocketContractService {
  private current: Namespace | null = null;

  constructor(private readonly auth: SocketAuthContractService) {}

  init(io: SocketIOServer, decode: JwtDecoder): Namespace {
    const namespace = io.of(STORAGE_MIGRATION_NAMESPACE);

    this.auth.protect(namespace, decode, { requireMaster: true });

    namespace.on('connection', (socket) => {
      const userId: string = socket.data.user?.sub ?? 'unknown';
      console.info(`[StorageMigration WS] Conectado: ${userId}`);

      socket.on('disconnect', () => {
        console.info(`[StorageMigration WS] Desconectado: ${userId}`);
      });
    });

    this.current = namespace;
    return namespace;
  }

  namespace(): Namespace | null {
    return this.current;
  }
}
