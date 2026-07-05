import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { downloadCsvFromApi } from '@/lib/csv-export';
import type { Merge } from '@/lib/interfaces';

type ExportTableRowsParams = Merge<Record<string, unknown>, { slug: string }>;

type Props = Pick<
  Omit<
    UseMutationOptions<
      void,
      AxiosError | Error,
      ExportTableRowsParams,
      unknown
    >,
    'mutationFn'
  >,
  'onError' | 'onSuccess'
>;

export function useTableRowsExportCsv(
  props: Props = {},
): UseMutationResult<void, AxiosError | Error, ExportTableRowsParams, unknown> {
  return useMutation({
    mutationFn: async function ({ slug, ...params }: ExportTableRowsParams) {
      try {
        await downloadCsvFromApi(
          `/tables/${slug}/rows/exports/csv`,
          params,
          `tabela-${slug}.csv`,
        );
      } catch (error) {
        if (
          error instanceof AxiosError &&
          error.response?.data instanceof Blob
        ) {
          try {
            const text = await error.response.data.text();
            error.response.data = JSON.parse(text);
          } catch {
            // ignore
          }
        }
        throw error;
      }
    },
    onError: props.onError,
    onSuccess: props.onSuccess,
  });
}
