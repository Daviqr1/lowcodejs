import type { UseSuspenseQueryResult } from '@tanstack/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';

export type IDocResponseField = {
  key: string;
  label: string;
  type: 'string' | 'date' | 'number' | 'boolean';
};

export type IDocumentType = {
  id: string;
  name: string;
  description: string | null;
  responseFields: Array<IDocResponseField>;
};

export type IDocTranscriptionConfig = {
  apiUrl: string | null;
  apiKey: string | null;
  model: string | null;
  documentTypes: Array<IDocumentType>;
};

export function useDocTranscriptionConfig(): UseSuspenseQueryResult<IDocTranscriptionConfig> {
  return useSuspenseQuery({
    queryKey: queryKeys.docTranscription.config(),
    queryFn: async function () {
      const response = await API.get<IDocTranscriptionConfig>(
        '/tools/doc-transcription/config',
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
