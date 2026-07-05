import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';

type GroupRowDeletePayload = {
  tableSlug: string;
  rowId: string;
  groupSlug: string;
  itemId: string;
};

type UseDeleteGroupRowProps = {
  onSuccess?: (variables: GroupRowDeletePayload) => void;
  onError?: (error: AxiosError | Error) => void;
};

export function useDeleteGroupRow(
  props: UseDeleteGroupRowProps,
): UseMutationResult<null, AxiosError | Error, GroupRowDeletePayload> {
  const queryClient = useQueryClient();

  return useMutation<null, AxiosError | Error, GroupRowDeletePayload>({
    mutationFn: async (payload) => {
      const route = `/tables/${payload.tableSlug}/rows/${payload.rowId}/groups/${payload.groupSlug}/${payload.itemId}`;
      await API.delete(route);
      return null;
    },
    onSuccess(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupRows.lists(
          variables.tableSlug,
          variables.rowId,
          variables.groupSlug,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.detail(variables.tableSlug, variables.rowId),
      });
      props.onSuccess?.(variables);
    },
    onError: props.onError,
  });
}
