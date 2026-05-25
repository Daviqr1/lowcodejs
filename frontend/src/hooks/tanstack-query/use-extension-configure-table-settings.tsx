import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IExtension } from '@/lib/interfaces';
import type { ExtensionConfigureTableSettingsPayload } from '@/lib/payloads';

type UseExtensionConfigureTableSettingsProps = Pick<
  Omit<
    UseMutationOptions<
      IExtension,
      AxiosError | Error,
      ExtensionConfigureTableSettingsPayload,
      unknown
    >,
    'mutationFn' | 'onSuccess'
  >,
  'onError'
> & {
  onSuccess?: (
    data: IExtension,
    variables: ExtensionConfigureTableSettingsPayload,
  ) => void;
};

export function useExtensionConfigureTableSettings(
  props: UseExtensionConfigureTableSettingsProps,
): UseMutationResult<
  IExtension,
  AxiosError | Error,
  ExtensionConfigureTableSettingsPayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function ({
      extensionId,
      tableId,
      settings,
      expectedUpdatedAt,
    }: ExtensionConfigureTableSettingsPayload) {
      const response = await API.patch<IExtension>(
        `/extensions/${extensionId}/table-settings/${tableId}`,
        { settings, expectedUpdatedAt },
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
