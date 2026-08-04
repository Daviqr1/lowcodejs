import { Service } from 'fastify-decorators';
import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';
import { SocketAuthContractService } from '@application/services/socket-auth/socket-auth-contract.service';

import type {
  TableImportEvent,
  TableImportEventPayload,
} from './import-table-socket-contract.service';
import {
  ImportTableSocketContractService,
  TABLE_IMPORT_NAMESPACE,
} from './import-table-socket-contract.service';

@Service()
export default class ImportTableSocketService implements ImportTableSocketContractService {
  private current: Namespace | null = null;

  constructor(private readonly auth: SocketAuthContractService) {}

  init(io: SocketIOServer, decode: JwtDecoder): Namespace {
    const namespace = io.of(TABLE_IMPORT_NAMESPACE);

    this.auth.protect(namespace, decode);

    namespace.on('connection', (socket) => {
      const userId: string = socket.data.user?.sub ?? '';
      if (userId) socket.join(`user:${userId}`);
    });

    this.current = namespace;
    return namespace;
  }

  namespace(): Namespace | null {
    return this.current;
  }

  emit(
    userId: string | undefined,
    event: TableImportEvent,
    payload: TableImportEventPayload,
  ): void {
    if (!this.current || !userId) return;
    this.current.to(`user:${userId}`).emit(event, payload);
  }
}
