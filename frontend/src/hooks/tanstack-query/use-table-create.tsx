import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { ITable, Merge } from '@/lib/interfaces';
import type { TableCreatePayload } from '@/lib/payloads';

type UseTableCreateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        ITable,
        AxiosError | Error,
        TableCreatePayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: ITable, variables: TableCreatePayload) => void;
  }
>;

export function useCreateTable(
  props: UseTableCreateProps,
): UseMutationResult<ITable, AxiosError | Error, TableCreatePayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: TableCreatePayload) {
      const route = '/tables';
      const response = await API.post<ITable>(route, payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKeys.tables.detail(data.slug), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.lists() });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
