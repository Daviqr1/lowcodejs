import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IMenu, Merge } from '@/lib/interfaces';
import type { MenuUpdatePayload } from '@/lib/payloads';

type UseMenuUpdateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<IMenu, AxiosError | Error, MenuUpdatePayload, unknown>,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IMenu, variables: MenuUpdatePayload) => void;
  }
>;

export function useUpdateMenu(
  props: UseMenuUpdateProps,
): UseMutationResult<IMenu, AxiosError | Error, MenuUpdatePayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function ({ _id, ...payload }: MenuUpdatePayload) {
      const route = '/menu/'.concat(_id);
      const response = await API.patch<IMenu>(route, payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKeys.menus.detail(variables._id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.menus.all });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
