import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IMenu, Merge } from '@/lib/interfaces';
import type { MenuCreatePayload } from '@/lib/payloads';

type UseMenuCreateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<IMenu, AxiosError | Error, MenuCreatePayload, unknown>,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IMenu, variables: MenuCreatePayload) => void;
  }
>;

export function useCreateMenu(
  props: UseMenuCreateProps,
): UseMutationResult<IMenu, AxiosError | Error, MenuCreatePayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: MenuCreatePayload) {
      const response = await API.post<IMenu>('/menu', payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKeys.menus.detail(data._id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.menus.all });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
