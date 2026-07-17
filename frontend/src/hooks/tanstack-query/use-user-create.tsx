import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IUser, Merge } from '@/lib/interfaces';
import type { UserCreatePayload } from '@/lib/payloads';

type UseUserCreateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<IUser, AxiosError | Error, UserCreatePayload, unknown>,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IUser, variables: UserCreatePayload) => void;
  }
>;

export function useCreateUser(
  props: UseUserCreateProps,
): UseMutationResult<IUser, AxiosError | Error, UserCreatePayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: UserCreatePayload) {
      const route = '/users';
      const response = await API.post<IUser>(route, payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKeys.users.detail(data._id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
