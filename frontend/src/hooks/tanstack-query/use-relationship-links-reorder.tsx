import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { Merge } from '@/lib/interfaces';

type Context = {
  tableSlug: string;
  relationshipId: string;
  side: 'source' | 'target';
  recordId: string;
};

type ReorderItem = { linkId: string; order: number };
type Payload = { items: Array<ReorderItem> };

type UseRelationshipLinksReorderProps = Merge<
  Context,
  {
    onSuccess?: (variables: Payload) => void;
    onError?: (error: AxiosError | Error, variables: Payload) => void;
  }
>;

export function useRelationshipLinksReorder(
  props: UseRelationshipLinksReorderProps,
): UseMutationResult<null, AxiosError | Error, Payload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: Payload): Promise<null> {
      const route = `/tables/${props.tableSlug}/relationships/${props.relationshipId}/links/reorder`;
      const response = await API.patch<null>(route, { items: payload.items });
      return response.data;
    },
    onSuccess(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.relationships.links(
          props.relationshipId,
          props.side,
          props.recordId,
        ),
      });
      props.onSuccess?.(variables);
    },
    onError(error, variables) {
      props.onError?.(error, variables);
    },
  });
}
