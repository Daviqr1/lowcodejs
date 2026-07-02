import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { relationshipRowsInfiniteOptions } from './_query-options';

import type { IRow, Paginated } from '@/lib/interfaces';

interface UseRelationshipRowsReadPaginatedInfiniteParams {
  tableSlug: string;
  fieldSlug: string;
  search?: string;
  perPage?: number;
  excludeLinked?: boolean;
  relationshipId?: string;
  excludeSide?: 'source' | 'target';
  excludeForRecordId?: string;
  excludeSelfId?: string;
}

export function useRelationshipRowsReadPaginatedInfinite(
  params: UseRelationshipRowsReadPaginatedInfiniteParams,
): UseInfiniteQueryResult<InfiniteData<Paginated<IRow>>, Error> {
  return useInfiniteQuery(relationshipRowsInfiniteOptions(params));
}
