/**
 * Socket.IO namespace `/storage-migration`.
 *
 * Real-time progress feed for the MASTER user during a storage migration or
 * cleanup job. Authentication is verified at handshake using the same access
 * token cookie as the rest of the app — only role MASTER is admitted.
 *
 * Emitted events (server → client):
 *   - progress       { job_id, processed, total, current_filename, failed_count, eta_seconds }
 *   - file_migrated  { _id, filename, from, to }
 *   - file_failed    { _id, filename, error, attempts }
 *   - completed      { job_id, total, succeeded, failed, duration_ms }
 *   - error          { job_id, message }
 */

import { getInstanceByToken } from 'fastify-decorators';
import type { Namespace, Server as SocketIOServer } from 'socket.io';

import {
  E_JWT_TYPE,
  type IJWTPayload,
  type TStorageLocation,
} from '@application/core/entity.core';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';
import UserMongooseRepository from '@application/repositories/user/user.repository';
import { GroupResolverContractService } from '@application/services/group-resolver/group-resolver-contract.service';
import GroupResolverService from '@application/services/group-resolver/group-resolver.service';
import { ACCESS_TOKEN_COOKIE } from '@application/utils/cookies.util';

export const STORAGE_MIGRATION_NAMESPACE = '/storage-migration';

export const STORAGE_MIGRATION_EVENT = {
  PROGRESS: 'progress',
  FILE_MIGRATED: 'file_migrated',
  FILE_FAILED: 'file_failed',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export type StorageMigrationProgressEvent = {
  job_id: string;
  processed: number;
  total: number;
  current_filename: string | null;
  failed_count: number;
  eta_seconds: number | null;
};

export type StorageMigrationFileMigratedEvent = {
  _id: string;
  filename: string;
  from: TStorageLocation;
  to: TStorageLocation;
};

export type StorageMigrationFileFailedEvent = {
  _id: string;
  filename: string;
  error: string;
  attempts: number;
};

export type StorageMigrationCompletedEvent = {
  job_id: string;
  total: number;
  succeeded: number;
  failed: number;
  duration_ms: number;
};

export type StorageMigrationErrorEvent = {
  job_id: string;
  message: string;
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

export function initStorageMigrationSocket(
  io: SocketIOServer,
  jwtDecode: (value: string) => IJWTPayload | null,
): Namespace {
  const namespace = io.of(STORAGE_MIGRATION_NAMESPACE);

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

    // Privilegio MASTER pelo fecho de grupos (grupo principal + adicionais +
    // englobados), nao pelo role do JWT — consistente com o RoleMiddleware.
    const userRepository = getInstanceByToken<UserContractRepository>(
      UserMongooseRepository,
    );
    const groupResolver =
      getInstanceByToken<GroupResolverContractService>(GroupResolverService);

    const user = await userRepository.findById(decoded.sub);
    if (!(await groupResolver.isMaster(user))) {
      next(new Error('Acesso negado.'));
      return;
    }

    socket.data.user = decoded;
    next();
  });

  namespace.on('connection', (socket) => {
    console.info(
      `[StorageMigration WS] Conectado: ${socket.data.user?.sub ?? 'unknown'}`,
    );

    socket.on('disconnect', () => {
      console.info(
        `[StorageMigration WS] Desconectado: ${socket.data.user?.sub ?? 'unknown'}`,
      );
    });
  });

  return namespace;
}
