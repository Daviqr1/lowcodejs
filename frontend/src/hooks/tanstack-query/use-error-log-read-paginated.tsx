import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { API } from '@/lib/api';

// Tipos do "Histórico de erros" definidos localmente (não em lib/interfaces)
// para manter o feature autocontido.
export interface IErrorLogUser {
  _id: string;
  name: string;
  email: string;
}

export interface IErrorLog {
  _id: string;
  statusCode: number;
  message: string;
  cause: string | null;
  method: string;
  url: string;
  user: IErrorLogUser | null;
  errors: unknown;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorLogPaginated {
  meta: {
    total: number;
    perPage: number;
    page: number;
    lastPage: number;
    firstPage: number;
  };
  data: Array<IErrorLog>;
}

export interface ErrorLogQuery {
  page?: number;
  perPage?: number;
  search?: string;
  // CSV de status HTTP (ex.: "404,500").
  statuses?: string;
  'date-from'?: string;
  'date-to'?: string;
  // 'true' = resolvidos; ausente/'false' = em aberto.
  resolved?: 'true' | 'false';
  'order-created-at'?: 'asc' | 'desc';
  'order-status'?: 'asc' | 'desc';
  'order-method'?: 'asc' | 'desc';
  'order-url'?: 'asc' | 'desc';
}

export function useErrorLogReadPaginated(
  params: ErrorLogQuery,
): UseQueryResult<ErrorLogPaginated, Error> {
  return useQuery({
    queryKey: ['error-logs', 'list', params],
    queryFn: async () => {
      const { data } = await API.get<ErrorLogPaginated>(
        '/error-logs/paginated',
        { params },
      );
      return data;
    },
    staleTime: 30 * 1000,
  });
}
