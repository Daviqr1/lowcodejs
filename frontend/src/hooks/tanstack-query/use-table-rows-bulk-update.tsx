import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { RowBulkUpdatePayload } from '@/lib/payloads';

export type BulkUpdateResult = {
  modified: number;
  errors?: Record<string, string>;
};

type UseBulkUpdateTableRowsProps = {
  onSuccess?: (data: BulkUpdateResult, variables: RowBulkUpdatePayload) => void;
  onError?: (error: AxiosError | Error) => void;
};

export function useBulkUpdateTableRows(
  props: UseBulkUpdateTableRowsProps = {},
): ReturnType<
  typeof useMutation<BulkUpdateResult, AxiosError | Error, RowBulkUpdatePayload>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: RowBulkUpdatePayload) {
      const route = '/tables/'.concat(payload.slug).concat('/rows/bulk-update');
      const response = await API.patch<BulkUpdateResult>(route, {
        ids: payload.ids,
        data: payload.data,
      });
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(variables.slug),
      });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
