import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IGroup, Merge } from '@/lib/interfaces';
import type { UserGroupUpdatePayload } from '@/lib/payloads';

type UseGroupUpdateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        IGroup,
        AxiosError | Error,
        UserGroupUpdatePayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IGroup, variables: UserGroupUpdatePayload) => void;
  }
>;

export function useUpdateGroup(
  props: UseGroupUpdateProps,
): UseMutationResult<
  IGroup,
  AxiosError | Error,
  UserGroupUpdatePayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: UserGroupUpdatePayload) {
      const route = '/user-group/'.concat(payload._id);
      const response = await API.patch<IGroup>(route, payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKeys.groups.detail(variables._id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
