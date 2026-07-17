import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IUser, Merge } from '@/lib/interfaces';
import type { ProfileUpdatePayload } from '@/lib/payloads';
import { useAuthStore } from '@/stores/authentication';

type UseProfileUpdateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        IUser,
        AxiosError | Error,
        ProfileUpdatePayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IUser, variables: ProfileUpdatePayload) => void;
  }
>;

export function useUpdateProfile(
  props: UseProfileUpdateProps,
): UseMutationResult<IUser, AxiosError | Error, ProfileUpdatePayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: ProfileUpdatePayload) {
      const route = '/profile';
      const response = await API.put<IUser>(route, payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKeys.profile.detail(data._id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      useAuthStore.getState().setUser(data);
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
