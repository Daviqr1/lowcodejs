import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

import { API } from '@/lib/api';

export type ITranscribeField = {
  key: string;
  label: string;
  type: 'string' | 'date' | 'number' | 'boolean';
  value: string | number | boolean | null;
};

export type ITranscribeResult = {
  documentTypeId: string;
  documentTypeName: string;
  fields: Array<ITranscribeField>;
  raw: unknown;
};

type Options = {
  onSuccess?: (data: ITranscribeResult) => void;
  onError?: (error: unknown) => void;
};

export function useDocTranscriptionTranscribe(
  options?: Options,
): UseMutationResult<ITranscribeResult, Error, FormData> {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await API.post<ITranscribeResult>(
        '/tools/doc-transcription/transcribe',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess(data) {
      options?.onSuccess?.(data);
    },
    onError(error) {
      options?.onError?.(error);
    },
  });
}
