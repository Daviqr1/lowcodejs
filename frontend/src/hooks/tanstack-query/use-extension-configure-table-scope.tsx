import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IExtension } from '@/lib/interfaces';
import type { ExtensionConfigureTableScopePayload } from '@/lib/payloads';

type UseExtensionConfigureTableScopeProps = Pick<
  Omit<
    UseMutationOptions<
      IExtension,
      AxiosError | Error,
      ExtensionConfigureTableScopePayload,
      unknown
    >,
    'mutationFn' | 'onSuccess'
  >,
  'onError'
> & {
  onSuccess?: (
    data: IExtension,
    variables: ExtensionConfigureTableScopePayload,
  ) => void;
};

export function useExtensionConfigureTableScope(
  props: UseExtensionConfigureTableScopeProps,
): UseMutationResult<
  IExtension,
  AxiosError | Error,
  ExtensionConfigureTableScopePayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function ({
      _id,
      mode,
      tableIds,
    }: ExtensionConfigureTableScopePayload) {
      const response = await API.patch<IExtension>(
        `/extensions/${_id}/table-scope`,
        { mode, tableIds },
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
