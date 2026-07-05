import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IRow } from '@/lib/interfaces';

type GroupRowUpdatePayload = {
  tableSlug: string;
  rowId: string;
  groupSlug: string;
  itemId: string;
  data: Record<string, unknown>;
};

type UseUpdateGroupRowProps = {
  onSuccess?: (data: IRow, variables: GroupRowUpdatePayload) => void;
  onError?: (error: AxiosError | Error) => void;
};

export function useUpdateGroupRow(
  props: UseUpdateGroupRowProps,
): UseMutationResult<IRow, AxiosError | Error, GroupRowUpdatePayload> {
  const queryClient = useQueryClient();

  return useMutation<IRow, AxiosError | Error, GroupRowUpdatePayload>({
    mutationFn: async (payload) => {
      const route = `/tables/${payload.tableSlug}/rows/${payload.rowId}/groups/${payload.groupSlug}/${payload.itemId}`;
      const response = await API.patch<IRow>(route, payload.data);
      return response.data;
    },
    onSuccess(data, variables) {
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
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
