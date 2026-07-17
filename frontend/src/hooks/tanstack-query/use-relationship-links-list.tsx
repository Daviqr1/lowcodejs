import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IRelationshipLink, Meta } from '@/lib/interfaces';

type Params = {
  tableSlug: string;
  relationshipId: string;
  side: 'source' | 'target';
  recordId: string;
  page?: number;
  perPage?: number;
  enabled?: boolean;
};

type ListResult = { data: Array<IRelationshipLink>; meta: Meta };

export function useRelationshipLinksList(
  params: Params,
): UseQueryResult<ListResult, Error> {
  const { enabled = true } = params;
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 10;

  return useQuery({
    queryKey: queryKeys.relationships.linksPaginated(
      params.relationshipId,
      params.side,
      params.recordId,
      { page, perPage },
    ),
    queryFn: async function (): Promise<ListResult> {
      const route = `/tables/${params.tableSlug}/relationships/${params.relationshipId}/links`;
      const response = await API.get<ListResult>(route, {
        params: { side: params.side, recordId: params.recordId, page, perPage },
      });
      return response.data;
    },
    enabled:
      enabled &&
      Boolean(params.tableSlug) &&
      Boolean(params.relationshipId) &&
      Boolean(params.recordId),
    staleTime: 30 * 1000,
  });
}
