import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { downloadCsvFromApi } from '@/lib/csv-export';

export type CsvExportParams = Record<string, unknown> | undefined;

/**
 * Os callers repassam a `search` inteira da rota, que sempre carrega `page`
 * (tem `.default(1)`) e pode carregar `order-*`/`perPage`. Nenhum dos endpoints
 * de export declara essas chaves e a querystring tem `additionalProperties:
 * false` — qualquer uma derruba o download com 400. Exportacao nao e paginada,
 * entao descartar aqui resolve para todos os callers.
 */
function stripPaginationParams(
  params: CsvExportParams,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params ?? {})) {
    if (key === 'page' || key === 'perPage') continue;
    if (key.startsWith('order-')) continue;
    if (value === undefined) continue;
    result[key] = value;
  }

  return result;
}

type UseCsvExportProps = Pick<
  Omit<
    UseMutationOptions<void, AxiosError | Error, CsvExportParams, unknown>,
    'mutationFn'
  >,
  'onError' | 'onSuccess'
>;

/**
 * Hook factory para exportação CSV. Encapsula:
 * - Chamada axios com `responseType: 'blob'`
 * - Download via `downloadBlob` respeitando `Content-Disposition`
 * - Conversão de erro Blob → JSON para que `handleApiError` consiga ler `cause`/`message`
 */
export function useCsvExport(
  endpoint: string,
  fallbackFilename = 'export.csv',
  props: UseCsvExportProps = {},
): UseMutationResult<void, AxiosError | Error, CsvExportParams, unknown> {
  return useMutation({
    mutationFn: async function (params: CsvExportParams) {
      try {
        await downloadCsvFromApi(
          endpoint,
          stripPaginationParams(params),
          fallbackFilename,
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
            // mantém blob original — handleApiError caira no fallback genérico
          }
        }
        throw error;
      }
    },
    onError: props.onError,
    onSuccess: props.onSuccess,
  });
}
