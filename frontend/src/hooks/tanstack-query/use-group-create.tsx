import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IGroup, Merge } from '@/lib/interfaces';
import type { UserGroupCreatePayload } from '@/lib/payloads';

type UseGroupCreateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        IGroup,
        AxiosError | Error,
        UserGroupCreatePayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IGroup, variables: UserGroupCreatePayload) => void;
  }
>;

export function useCreateGroup(
  props: UseGroupCreateProps,
): UseMutationResult<
  IGroup,
  AxiosError | Error,
  UserGroupCreatePayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: UserGroupCreatePayload) {
      const route = '/user-group';
      const response = await API.post<IGroup>(route, payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(queryKeys.groups.detail(data._id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
