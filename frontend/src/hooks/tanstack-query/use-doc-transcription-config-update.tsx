import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './_query-keys';
import type { IDocTranscriptionConfig } from './use-doc-transcription-config';

import { API } from '@/lib/api';

type UpdateConfigPayload = {
  apiUrl?: string | null;
  apiKey?: string | null;
  model?: string | null;
  documentTypes?: IDocTranscriptionConfig['documentTypes'];
};

type Options = {
  onSuccess?: (data: IDocTranscriptionConfig) => void;
  onError?: (error: unknown) => void;
};

export function useDocTranscriptionConfigUpdate(
  options?: Options,
): UseMutationResult<IDocTranscriptionConfig, Error, UpdateConfigPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateConfigPayload) => {
      const response = await API.patch<IDocTranscriptionConfig>(
        '/tools/doc-transcription/config',
        payload,
      );
      return response.data;
    },
    onSuccess(data) {
      queryClient.setQueryData(queryKeys.docTranscription.config(), data);
      options?.onSuccess?.(data);
    },
    onError(error) {
      options?.onError?.(error);
    },
  });
}
