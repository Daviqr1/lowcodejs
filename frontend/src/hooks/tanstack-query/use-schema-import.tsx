import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { Merge } from '@/lib/interfaces';
import type { SchemaImportPayload, SchemaImportResponse } from '@/lib/payloads';

type UseSchemaImportProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        SchemaImportResponse,
        AxiosError | Error,
        SchemaImportPayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (
      data: SchemaImportResponse,
      variables: SchemaImportPayload,
    ) => void;
  }
>;

export function useSchemaImport(
  props: UseSchemaImportProps = {},
): UseMutationResult<
  SchemaImportResponse,
  AxiosError | Error,
  SchemaImportPayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: SchemaImportPayload) {
      const response = await API.post<SchemaImportResponse>(
        '/tables/schema-import',
        payload,
      );
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.lists() });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
