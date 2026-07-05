import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { ISetupStatus } from '@/lib/interfaces';
import type { SetupUploadPayload } from '@/lib/payloads';

type Props = {
  onSuccess?: (data: ISetupStatus) => void;
  onError?: (error: unknown) => void;
};

export function useSetupSubmitUpload(
  props: Props = {},
): UseMutationResult<ISetupStatus, unknown, SetupUploadPayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SetupUploadPayload) => {
      const { data } = await API.put<ISetupStatus>(
        '/setup/step/upload',
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.setup.status(), data);
      if (props.onSuccess) {
        props.onSuccess(data);
      }
    },
    onError: (error) => {
      if (props.onError) {
        props.onError(error);
      }
    },
  });
}
