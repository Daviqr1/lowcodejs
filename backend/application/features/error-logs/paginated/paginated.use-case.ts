import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import HTTPException from '@application/core/exception.core';
import {
  ErrorLogContractRepository,
  type ErrorLogQueryPayload,
  type IErrorLog,
} from '@application/repositories/error-log/error-log-contract.repository';
import { HttpResponseContractService } from '@application/services/http-response/http-response-contract.service';

import type { ErrorLogPaginatedPayload } from '../_shared.validator';

type Meta = {
  total: number;
  perPage: number;
  page: number;
  lastPage: number;
  firstPage: number;
};

type Result = {
  meta: Meta;
  data: IErrorLog[];
};

type Response = Either<HTTPException, Result>;

// Mapeia os search params `order-*` da tela para os campos do documento.
const ORDER_FIELD: Array<[keyof ErrorLogPaginatedPayload, string]> = [
  ['order-created-at', 'createdAt'],
  ['order-status', 'statusCode'],
  ['order-method', 'method'],
  ['order-url', 'url'],
];

@Service()
export default class ErrorLogPaginatedUseCase {
  private parseStatuses(raw: string | undefined): number[] | undefined {
    if (!raw) return undefined;
    const list = raw
      .split(',')
      .map((token) => Number(token.trim()))
      .filter((value) => Number.isInteger(value));
    if (list.length > 0) return list;
    return undefined;
  }

  private parseDate(raw: string | undefined): Date | undefined {
    if (!raw) return undefined;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
  }

  private buildSort(payload: ErrorLogPaginatedPayload): Record<string, 1 | -1> {
    const sort: Record<string, 1 | -1> = {};
    for (const [key, field] of ORDER_FIELD) {
      const direction = payload[key];
      if (direction === 'asc') sort[field] = 1;
      if (direction === 'desc') sort[field] = -1;
    }
    return sort;
  }

  private toQueryPayload(
    payload: ErrorLogPaginatedPayload,
  ): ErrorLogQueryPayload {
    return {
      page: payload.page,
      perPage: payload.perPage,
      search: payload.search,
      statuses: this.parseStatuses(payload.statuses),
      dateFrom: this.parseDate(payload['date-from']),
      dateTo: this.parseDate(payload['date-to']),
      resolved: payload.resolved === true,
      sort: this.buildSort(payload),
    };
  }
  constructor(
    private readonly repository: ErrorLogContractRepository,
    private readonly http: HttpResponseContractService,
  ) {}

  async execute(payload: ErrorLogPaginatedPayload): Promise<Response> {
    try {
      const query = this.toQueryPayload(payload);

      const data = await this.repository.findMany(query);
      const total = await this.repository.count(query);
      const meta = this.http.paginationMeta(total, payload);

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
