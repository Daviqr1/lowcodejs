import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { ISetting, Merge } from '@/lib/interfaces';
import type { SettingUpdatePayload } from '@/lib/payloads';

type UseSettingUpdateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        ISetting,
        AxiosError | Error,
        SettingUpdatePayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: ISetting, variables: SettingUpdatePayload) => void;
  }
>;

export function useUpdateSetting(
  props: UseSettingUpdateProps,
): UseMutationResult<
  ISetting,
  AxiosError | Error,
  SettingUpdatePayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: SettingUpdatePayload) {
      const route = '/setting';
      const response = await API.put<ISetting>(route, payload);
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.storageMigration.all,
      });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
