import { Service } from 'fastify-decorators';
import mongoose from 'mongoose';

import { E_LOGGER_OBJECT_TYPE } from '@application/core/entity.core';

import type {
  LoggerAuditParams,
  LoggerObjectAudit,
} from './logger-audit-contract.service';
import {
  EMPTY_OBJECT_AUDIT,
  LoggerAuditContractService,
} from './logger-audit-contract.service';

const ROW_URL_PATTERN = /\/tables\/([^/]+)\/rows/;
const AUDIT_PROJECTION = {
  creator: 1,
  updater: 1,
  createdAt: 1,
  updatedAt: 1,
};

function toObjectIdOrNull(value: unknown): mongoose.Types.ObjectId | null {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  try {
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

@Service()
export default class LoggerAuditService implements LoggerAuditContractService {
  tableSlugFromRowUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const path = url.split('?')[0];
    const match = path.match(ROW_URL_PATTERN);
    if (!match) return null;
    return match[1];
  }

  async resolve(params: LoggerAuditParams): Promise<LoggerObjectAudit> {
    const { systemDb, dataDb, object, objectId, url } = params;

    if (object !== E_LOGGER_OBJECT_TYPE.ROW || !objectId) {
      return EMPTY_OBJECT_AUDIT;
    }

    const slug = this.tableSlugFromRowUrl(url);
    if (!slug) return EMPTY_OBJECT_AUDIT;

    const table = await systemDb
      .collection('tables')
      .findOne({ slug }, { projection: { _id: 1 } });
    if (!table) return EMPTY_OBJECT_AUDIT;

    const _id = toObjectIdOrNull(objectId);
    if (!_id) return EMPTY_OBJECT_AUDIT;

    // Linhas vivem no DB data (apos a dual-connection). Fallback ao DB system
    // para instalacoes que ainda nao migraram ou nao droparam a origem.
    let row = await dataDb
      .collection(slug)
      .findOne({ _id }, { projection: AUDIT_PROJECTION });
    if (!row) {
      row = await systemDb
        .collection(slug)
        .findOne({ _id }, { projection: AUDIT_PROJECTION });
    }
    if (!row) return EMPTY_OBJECT_AUDIT;

    return {
      creator: toObjectIdOrNull(row.creator),
      updater: toObjectIdOrNull(row.updater),
      objectCreatedAt: toDateOrNull(row.createdAt),
      objectUpdatedAt: toDateOrNull(row.updatedAt),
    };
  }
}
