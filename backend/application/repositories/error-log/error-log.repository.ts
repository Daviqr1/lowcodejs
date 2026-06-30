import { Service } from 'fastify-decorators';

import { ErrorLog } from '@application/model/error-log.model';

import {
  ErrorLogContractRepository,
  type ErrorLogCreatePayload,
  type ErrorLogQueryPayload,
  type IErrorLog,
  type IErrorLogUser,
} from './error-log-contract.repository';

// Usuário populado via `.populate('user', 'name email')`.
interface ErrorLogLeanUser {
  _id: unknown;
  name?: string;
  email?: string;
}

// Shape via `.lean<T>()` — inclui timestamps e evita `as` no mapeamento.
interface ErrorLogLean {
  _id: unknown;
  statusCode: number;
  message: string;
  cause: string | null;
  method: string;
  url: string;
  user: ErrorLogLeanUser | null;
  errors: unknown;
  resolved?: boolean;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function buildFilter(payload: ErrorLogQueryPayload): Record<string, unknown> {
  // Nada anônimo: ignora qualquer log sem usuário (inclusive registros legados
  // gravados antes do hook passar a exigir usuário autenticado).
  const filter: Record<string, unknown> = { user: { $ne: null } };

  if (payload.statuses && payload.statuses.length > 0) {
    filter.statusCode = { $in: payload.statuses };
  }

  if (payload.search) {
    filter.message = { $regex: payload.search, $options: 'i' };
  }

  const createdAt: Record<string, Date> = {};
  if (payload.dateFrom) createdAt.$gte = payload.dateFrom;
  if (payload.dateTo) createdAt.$lte = payload.dateTo;
  if (Object.keys(createdAt).length > 0) {
    filter.createdAt = createdAt;
  }

  // Em aberto inclui registros legados sem o campo (`$ne: true`).
  if (payload.resolved === true) {
    filter.resolved = true;
  } else if (payload.resolved === false) {
    filter.resolved = { $ne: true };
  }

  return filter;
}

function toEntity(doc: ErrorLogLean): IErrorLog {
  let user: IErrorLogUser | null = null;
  if (doc.user) {
    user = {
      _id: String(doc.user._id),
      name: doc.user.name ?? '',
      email: doc.user.email ?? '',
    };
  }

  return {
    _id: String(doc._id),
    statusCode: doc.statusCode,
    message: doc.message,
    cause: doc.cause ?? null,
    method: doc.method,
    url: doc.url,
    user,
    errors: doc.errors ?? null,
    resolved: doc.resolved ?? false,
    resolvedAt: doc.resolvedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

@Service()
export default class ErrorLogMongooseRepository extends ErrorLogContractRepository {
  async create(payload: ErrorLogCreatePayload): Promise<void> {
    await ErrorLog.create({
      statusCode: payload.statusCode,
      message: payload.message,
      cause: payload.cause ?? null,
      method: payload.method,
      url: payload.url,
      user: payload.user_id ?? null,
      errors: payload.errors ?? null,
    });
  }

  async findMany(payload: ErrorLogQueryPayload): Promise<IErrorLog[]> {
    const skip = (payload.page - 1) * payload.perPage;

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (payload.sort && Object.keys(payload.sort).length > 0) {
      sort = payload.sort;
    }

    const docs = await ErrorLog.find(buildFilter(payload))
      .populate('user', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(payload.perPage)
      .lean<ErrorLogLean[]>();

    return docs.map(toEntity);
  }

  async count(payload: ErrorLogQueryPayload): Promise<number> {
    return ErrorLog.countDocuments(buildFilter(payload));
  }

  async setResolved(id: string, resolved: boolean): Promise<boolean> {
    const result = await ErrorLog.updateOne(
      { _id: id },
      { resolved, resolvedAt: resolved ? new Date() : null },
    );
    // matchedCount (não modifiedCount): remarcar um estado igual ainda é "achou".
    return result.matchedCount > 0;
  }
}
