import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { Merge } from '@/lib/interfaces';

export type StorageMigrationCleanupResponse = {
  job_id: string;
  queued_count: number;
};

type Response = { data: StorageMigrationCleanupResponse };

type Props = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        StorageMigrationCleanupResponse,
        AxiosError | Error,
        void,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: StorageMigrationCleanupResponse) => void;
  }
>;

export function useStorageMigrationCleanup(
  props: Props = {},
): UseMutationResult<
  StorageMigrationCleanupResponse,
  AxiosError | Error,
  void,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function () {
      const response = await API.post<Response>('/storage/migration/cleanup', {
        confirm: true,
      });
      return response.data.data;
    },
    onSuccess(data) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.storageMigration.all,
      });
      props.onSuccess?.(data);
    },
    onError: props.onError,
  });
}
