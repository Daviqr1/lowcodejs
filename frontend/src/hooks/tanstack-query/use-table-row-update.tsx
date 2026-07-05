import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IRow, Merge } from '@/lib/interfaces';
import type { RowUpdatePayload } from '@/lib/payloads';

type UseTableRowUpdateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<IRow, AxiosError | Error, RowUpdatePayload, unknown>,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IRow, variables: RowUpdatePayload) => void;
  }
>;

export function useUpdateTableRow(
  props: UseTableRowUpdateProps,
): ReturnType<typeof useMutation<IRow, AxiosError | Error, RowUpdatePayload>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: RowUpdatePayload) {
      const route = '/tables/'
        .concat(payload.slug)
        .concat('/rows/')
        .concat(payload.rowId);
      const response = await API.put<IRow>(route, payload.data);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(
        queryKeys.rows.detail(variables.slug, variables.rowId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(variables.slug),
      });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
