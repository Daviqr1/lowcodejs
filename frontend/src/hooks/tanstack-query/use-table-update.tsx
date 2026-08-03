import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { ITable, Merge } from '@/lib/interfaces';
import type { TableUpdatePayload } from '@/lib/payloads';

type UseTableUpdateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        ITable,
        AxiosError | Error,
        TableUpdatePayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: ITable, variables: TableUpdatePayload) => void;
  }
>;

export function useUpdateTable(
  props: UseTableUpdateProps,
): UseMutationResult<ITable, AxiosError | Error, TableUpdatePayload, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function ({
      routeSlug,
      fields,
      ...body
    }: TableUpdatePayload) {
      // `routeSlug` identifica a rota e `fields` nao e aceito pelo endpoint —
      // o body tem `additionalProperties: false`, entao qualquer uma das duas
      // derrubava o update inteiro com 400.
      const response = await API.put<ITable>(`/tables/${routeSlug}`, body);
      return response.data;
    },
    onSuccess(data, variables) {
      if (data.slug !== variables.routeSlug) {
        queryClient.removeQueries({
          queryKey: queryKeys.tables.detail(variables.routeSlug),
        });
        queryClient.removeQueries({
          queryKey: queryKeys.rows.all(variables.routeSlug),
        });
      }
      queryClient.setQueryData(queryKeys.tables.detail(data.slug), data);
      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(data.slug),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.lists() });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
