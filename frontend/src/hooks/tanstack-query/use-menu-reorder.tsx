import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { Merge } from '@/lib/interfaces';
import type { MenuReorderPayload } from '@/lib/payloads';

type UseMenuReorderProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<null, AxiosError | Error, MenuReorderPayload, unknown>,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: null, variables: MenuReorderPayload) => void;
  }
>;

export function useMenuReorder(
  props: UseMenuReorderProps,
): UseMutationResult<null, AxiosError | Error, MenuReorderPayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: MenuReorderPayload) {
      const response = await API.patch<null>('/menu/reorder', payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({ queryKey: queryKeys.menus.all });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
