import { Service } from 'fastify-decorators';
import type { Namespace, Server as SocketIOServer } from 'socket.io';

import type { JwtDecoder } from '@application/services/socket-auth/socket-auth-contract.service';
import { SocketAuthContractService } from '@application/services/socket-auth/socket-auth-contract.service';

import type { StoredFinalEvent } from './csv-import-socket-contract.service';
import {
  CSV_IMPORT_EVENT,
  CSV_IMPORT_NAMESPACE,
  CsvImportSocketContractService,
} from './csv-import-socket-contract.service';

// Janela para reentregar o resultado a quem conectar depois do fim do job.
const RESULT_TTL_MS = 10 * 60 * 1000;

@Service()
export default class CsvImportSocketService implements CsvImportSocketContractService {
  private current: Namespace | null = null;
  private readonly results = new Map<string, StoredFinalEvent>();

  constructor(private readonly auth: SocketAuthContractService) {}

  init(io: SocketIOServer, decode: JwtDecoder): Namespace {
    const namespace = io.of(CSV_IMPORT_NAMESPACE);

    this.auth.protect(namespace, decode, { requirePrivileged: true });

    namespace.on('connection', (socket) => {
      socket.on('join', (jobId: string) => {
        socket.join(`job:${jobId}`);

        const stored = this.results.get(jobId);
        if (!stored) return;

        if (stored.kind === 'completed') {
          socket.emit(CSV_IMPORT_EVENT.COMPLETED, stored.event);
          return;
        }

        socket.emit(CSV_IMPORT_EVENT.ERROR, stored.event);
      });
    });

    this.current = namespace;
    return namespace;
  }

  namespace(): Namespace | null {
    return this.current;
  }

  storeResult(jobId: string, result: StoredFinalEvent): void {
    this.results.set(jobId, result);
    setTimeout(() => this.results.delete(jobId), RESULT_TTL_MS);
  }
}
