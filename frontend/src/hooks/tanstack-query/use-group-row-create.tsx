import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IRow } from '@/lib/interfaces';

type GroupRowCreatePayload = {
  tableSlug: string;
  rowId: string;
  groupSlug: string;
  data: Record<string, unknown>;
};

type UseCreateGroupRowProps = {
  onSuccess?: (data: IRow, variables: GroupRowCreatePayload) => void;
  onError?: (error: AxiosError | Error) => void;
};

export function useCreateGroupRow(
  props: UseCreateGroupRowProps,
): UseMutationResult<IRow, AxiosError | Error, GroupRowCreatePayload> {
  const queryClient = useQueryClient();

  return useMutation<IRow, AxiosError | Error, GroupRowCreatePayload>({
    mutationFn: async (payload) => {
      const route = `/tables/${payload.tableSlug}/rows/${payload.rowId}/groups/${payload.groupSlug}`;
      const response = await API.post<IRow>(route, payload.data);
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
