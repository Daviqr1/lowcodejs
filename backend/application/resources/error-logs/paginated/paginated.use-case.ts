/* eslint-disable no-unused-vars */
import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import {
  ErrorLogContractRepository,
  type ErrorLogQueryPayload,
  type IErrorLog,
} from '@application/repositories/error-log/error-log-contract.repository';

import type { ErrorLogPaginatedPayload } from './paginated.validator';

interface Meta {
  total: number;
  perPage: number;
  page: number;
  lastPage: number;
  firstPage: number;
}

interface Result {
  meta: Meta;
  data: IErrorLog[];
}

type Response = Either<HTTPException, Result>;

// Mapeia os search params `order-*` da tela para os campos do documento.
const ORDER_FIELD: Record<string, string> = {
  'order-created-at': 'createdAt',
  'order-status': 'statusCode',
  'order-method': 'method',
  'order-url': 'url',
};

function parseStatuses(raw: string | undefined): number[] | undefined {
  if (!raw) return undefined;
  const list = raw
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isInteger(value));
  return list.length > 0 ? list : undefined;
}

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function buildSort(payload: ErrorLogPaginatedPayload): Record<string, 1 | -1> {
  const sort: Record<string, 1 | -1> = {};
  for (const [key, field] of Object.entries(ORDER_FIELD)) {
    const direction = payload[key as keyof ErrorLogPaginatedPayload];
    if (direction === 'asc') sort[field] = 1;
    if (direction === 'desc') sort[field] = -1;
  }
  return sort;
}

function toQueryPayload(
  payload: ErrorLogPaginatedPayload,
): ErrorLogQueryPayload {
  return {
    page: payload.page,
    perPage: payload.perPage,
    search: payload.search,
    statuses: parseStatuses(payload.statuses),
    dateFrom: parseDate(payload['date-from']),
    dateTo: parseDate(payload['date-to']),
    resolved: payload.resolved === 'true',
    sort: buildSort(payload),
  };
}

@Service()
export default class ErrorLogPaginatedUseCase {
  constructor(private readonly repository: ErrorLogContractRepository) {}

  async execute(payload: ErrorLogPaginatedPayload): Promise<Response> {
    try {
      const query = toQueryPayload(payload);

      const data = await this.repository.findMany(query);
      const total = await this.repository.count(query);
      const lastPage = Math.ceil(total / payload.perPage);

      const meta: Meta = {
        total,
        perPage: payload.perPage,
        page: payload.page,
        lastPage,
        firstPage: Math.min(total, 1),
      };

      return right({ meta, data });
    } catch (error) {
      console.error('[error-logs > paginated][error]:', error);
      return left(
        HTTPException.InternalServerError(
          'Erro interno do servidor',
          'LIST_ERROR_LOGS_ERROR',
        ),
      );
    }
  }
}
