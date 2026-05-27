import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type {
  ExtensionBulkConfigureTableSettingsPayload,
  ExtensionBulkConfigureTableSettingsResponse,
} from '@/lib/payloads';

type UseProps = Pick<
  Omit<
    UseMutationOptions<
      ExtensionBulkConfigureTableSettingsResponse,
      AxiosError | Error,
      ExtensionBulkConfigureTableSettingsPayload,
      unknown
    >,
    'mutationFn' | 'onSuccess'
  >,
  'onError'
> & {
  onSuccess?: (
    data: ExtensionBulkConfigureTableSettingsResponse,
    variables: ExtensionBulkConfigureTableSettingsPayload,
  ) => void;
};

export function useExtensionBulkConfigureTableSettings(
  props: UseProps,
): UseMutationResult<
  ExtensionBulkConfigureTableSettingsResponse,
  AxiosError | Error,
  ExtensionBulkConfigureTableSettingsPayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function ({
      extensionId,
      tableIds,
      settings,
      expectedUpdatedAt,
    }: ExtensionBulkConfigureTableSettingsPayload) {
      const response =
        await API.patch<ExtensionBulkConfigureTableSettingsResponse>(
          `/extensions/${extensionId}/bulk-table-settings`,
          { tableIds, settings, expectedUpdatedAt },
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
