/**
 * Socket.IO namespace `/csv-import`.
 *
 * Real-time progress feed for CSV row import jobs. Authentication is verified
 * at handshake using the same access token cookie as the rest of the app —
 * only roles MASTER and ADMINISTRATOR are admitted.
 *
 * Rooms: each import job gets its own room `job:{jobId}`. Clients must emit
 * `join` with the jobId string immediately after connecting.
 *
 * Emitted events (server → client):
 *   - progress   { job_id, processed, total }
 *   - completed  { job_id, imported, skipped, total }
 *   - error      { job_id, message, cause }
 *
 * Race-condition protection: the final event (completed/error) is stored in
 * memory for 10 minutes. If a client joins after the job has finished, the
 * stored event is replayed immediately so the UI always receives a terminal
 * state.
 */

import { getInstanceByToken } from 'fastify-decorators';
import type { Namespace, Server } from 'socket.io';

import { E_JWT_TYPE, type IJWTPayload } from '@application/core/entity.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import UserMongooseRepository from '@application/repositories/user/user.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';
import { ACCESS_TOKEN_COOKIE } from '@application/services/session/session-contract.service';

export const CSV_IMPORT_NAMESPACE = '/csv-import';

export const CSV_IMPORT_EVENT = {
  PROGRESS: 'progress',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type CsvImportProgressEvent = {
  job_id: string;
  processed: number;
  total: number;
};

export type CsvImportCompletedEvent = {
  job_id: string;
  imported: number;
  skipped: number;
  total: number;
};

export type CsvImportErrorEvent = {
  job_id: string;
  message: string;
  cause: string;
};

type StoredFinalEvent =
  | { kind: 'completed'; event: CsvImportCompletedEvent }
  | { kind: 'error'; event: CsvImportErrorEvent };

export type CsvImportSocketInit = {
  namespace: Namespace;
  storeResult: (jobId: string, result: StoredFinalEvent) => void;
};

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

export function initCsvImportSocket(
  io: Server,
  jwtDecode: (token: string) => IJWTPayload | null,
): CsvImportSocketInit {
  const namespace = io.of(CSV_IMPORT_NAMESPACE);
  const results = new Map<string, StoredFinalEvent>();

  namespace.use(async (socket, next) => {
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

    // Privilegio resolvido pelo fecho de grupos (nao pelo role do JWT, que so
    // reflete o grupo principal): MASTER/ADMINISTRATOR por grupo adicional ou
    // englobado tambem e admitido.
    const userRepository = getInstanceByToken<UserContractRepository>(
      UserMongooseRepository,
    );
    const groupResolver =
      getInstanceByToken<GroupResolverContractService>(GroupResolverService);

    const user = await userRepository.findById(decoded.sub);

    if (!(await groupResolver.isPrivileged(user))) {
      next(new Error('Acesso negado.'));
      return;
    }

    socket.data.user = decoded;
    next();
  });

  namespace.on('connection', (socket) => {
    socket.on('join', (jobId: string) => {
      socket.join('job:' + jobId);

      const stored = results.get(jobId);
      if (!stored) return;

      if (stored.kind === 'completed') {
        socket.emit(CSV_IMPORT_EVENT.COMPLETED, stored.event);
        return;
      }

      socket.emit(CSV_IMPORT_EVENT.ERROR, stored.event);
    });

    socket.on('disconnect', () => {});
  });

  function storeResult(jobId: string, result: StoredFinalEvent): void {
    results.set(jobId, result);
    setTimeout(
      (): void => {
        results.delete(jobId);
      },
      10 * 60 * 1000,
    );
  }

  return { namespace, storeResult };
}
