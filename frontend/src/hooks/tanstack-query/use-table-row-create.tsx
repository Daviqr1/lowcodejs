import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IRow, Merge } from '@/lib/interfaces';
import type { RowCreatePayload } from '@/lib/payloads';

type UseTableRowCreateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<IRow, AxiosError | Error, RowCreatePayload, unknown>,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IRow, variables: RowCreatePayload) => void;
  }
>;

export function useCreateTableRow(
  props: UseTableRowCreateProps,
): ReturnType<typeof useMutation<IRow, AxiosError | Error, RowCreatePayload>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: RowCreatePayload) {
      const route = '/tables/'.concat(payload.slug).concat('/rows');
      const response = await API.post<IRow>(route, payload.data);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(
        queryKeys.rows.detail(variables.slug, data._id),
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
