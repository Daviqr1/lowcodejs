import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IRelationshipLink, Merge } from '@/lib/interfaces';

type Context = {
  tableSlug: string;
  relationshipId: string;
  side: 'source' | 'target';
  recordId: string;
};

type Payload = {
  otherId: string;
  metadata?: Record<string, unknown>;
};

type UseRelationshipLinkCreateProps = Merge<
  Context,
  {
    onSuccess?: (link: IRelationshipLink, variables: Payload) => void;
    onError?: (error: AxiosError | Error, variables: Payload) => void;
  }
>;

export function useRelationshipLinkCreate(
  props: UseRelationshipLinkCreateProps,
): UseMutationResult<IRelationshipLink, AxiosError | Error, Payload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: Payload): Promise<IRelationshipLink> {
      const route = `/tables/${props.tableSlug}/relationships/${props.relationshipId}/links`;
      const response = await API.post<IRelationshipLink>(route, {
        side: props.side,
        recordId: props.recordId,
        otherId: payload.otherId,
        ...(payload.metadata && { metadata: payload.metadata }),
      });
      return response.data;
    },
    onSuccess(link, variables) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.relationships.links(
          props.relationshipId,
          props.side,
          props.recordId,
        ),
      });
      // Atualiza o detalhe da row (record[field.slug] é projetado na leitura):
      // sem isto, o vínculo single recém-criado não aparece e o limite de 1
      // não barra novas adições. Simétrico ao invalidate do delete.
      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.all(props.tableSlug),
      });
      props.onSuccess?.(link, variables);
    },
    onError(error, variables) {
      props.onError?.(error, variables);
    },
  });
}
