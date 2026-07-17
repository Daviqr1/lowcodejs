import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { ICloneTableResponse, Merge } from '@/lib/interfaces';
import type { CloneTablePayload } from '@/lib/payloads';

type UseCloneTableProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        ICloneTableResponse,
        AxiosError | Error,
        CloneTablePayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (
      data: ICloneTableResponse,
      variables: CloneTablePayload,
    ) => void;
  }
>;

export function useCloneTable(
  props: UseCloneTableProps,
): UseMutationResult<
  ICloneTableResponse,
  AxiosError | Error,
  CloneTablePayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: CloneTablePayload) {
      const route = '/tools/clone-table';
      const response = await API.post<ICloneTableResponse>(route, payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.lists() });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
