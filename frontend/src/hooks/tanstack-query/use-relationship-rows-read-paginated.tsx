import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { relationshipRowsOptions } from './_query-options';

import type { IRow, Paginated } from '@/lib/interfaces';

type Params = {
  tableSlug: string;
  fieldSlug: string;
  search?: string;
  page?: number;
  perPage?: number;
  excludeSelfId?: string;
  enabled?: boolean;
};

export function useRelationshipRowsReadPaginated(
  params: Params,
): UseQueryResult<Paginated<IRow>, Error> {
  const { enabled = true, ...rest } = params;

  return useQuery({
    ...relationshipRowsOptions(rest),
    enabled: Boolean(params.tableSlug) && enabled,
  });
}
