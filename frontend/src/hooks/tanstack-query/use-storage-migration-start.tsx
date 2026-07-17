import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { Merge } from '@/lib/interfaces';

export type StorageMigrationStartPayload = {
  concurrency?: number;
  retry_failed_only?: boolean;
};

export type StorageMigrationStartResponse = {
  job_id: string;
  queued_count: number;
};

type Response = { data: StorageMigrationStartResponse };

type Props = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        StorageMigrationStartResponse,
        AxiosError | Error,
        StorageMigrationStartPayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: StorageMigrationStartResponse) => void;
  }
>;

export function useStorageMigrationStart(
  props: Props = {},
): UseMutationResult<
  StorageMigrationStartResponse,
  AxiosError | Error,
  StorageMigrationStartPayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: StorageMigrationStartPayload) {
      const response = await API.post<Response>(
        '/storage/migration/start',
        payload,
      );
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
