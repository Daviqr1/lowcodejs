import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { rowListOptions } from './_query-options';

import type { IRow, Paginated } from '@/lib/interfaces';

export function useReadTableRowPaginated(payload: {
  slug: string;
  search: Record<string, unknown>;
  fallbackPerPage?: number;
}): UseQueryResult<Paginated<IRow>, Error> {
  return useQuery(
    rowListOptions(payload.slug, payload.search, payload.fallbackPerPage),
  );
}
