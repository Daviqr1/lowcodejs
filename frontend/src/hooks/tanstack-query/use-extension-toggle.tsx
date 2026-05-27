import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IExtension } from '@/lib/interfaces';
import type { ExtensionTogglePayload } from '@/lib/payloads';

type UseExtensionToggleProps = Pick<
  Omit<
    UseMutationOptions<
      IExtension,
      AxiosError | Error,
      ExtensionTogglePayload,
      unknown
    >,
    'mutationFn' | 'onSuccess'
  >,
  'onError'
> & {
  onSuccess?: (data: IExtension, variables: ExtensionTogglePayload) => void;
};

export function useExtensionToggle(
  props: UseExtensionToggleProps,
): UseMutationResult<
  IExtension,
  AxiosError | Error,
  ExtensionTogglePayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function ({ _id, enabled }: ExtensionTogglePayload) {
      const response = await API.patch<IExtension>(
        `/extensions/${_id}/toggle`,
        { enabled },
      );
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
