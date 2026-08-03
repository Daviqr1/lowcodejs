import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { Merge } from '@/lib/interfaces';
import type {
  ExtensionBulkConfigureTableSettingsPayload,
  ExtensionBulkConfigureTableSettingsResponse,
} from '@/lib/payloads';

type UseProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<
        ExtensionBulkConfigureTableSettingsResponse,
        AxiosError | Error,
        ExtensionBulkConfigureTableSettingsPayload,
        unknown
      >,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (
      data: ExtensionBulkConfigureTableSettingsResponse,
      variables: ExtensionBulkConfigureTableSettingsPayload,
    ) => void;
  }
>;

export function useExtensionBulkConfigureTableSettings(
  props: UseProps,
): UseMutationResult<
  ExtensionBulkConfigureTableSettingsResponse,
  AxiosError | Error,
  ExtensionBulkConfigureTableSettingsPayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function ({
      _id,
      tableIds,
      settings,
    }: ExtensionBulkConfigureTableSettingsPayload) {
      // O backend espera um mapa tableId -> settings; a UI aplica a mesma
      // configuracao em todas as tabelas selecionadas.
      const tableSettings = Object.fromEntries(
        tableIds.map((tableId) => [tableId, settings]),
      );

      const response =
        await API.patch<ExtensionBulkConfigureTableSettingsResponse>(
          `/extensions/${_id}/bulk-table-settings`,
          { tableSettings },
        );
      return response.data;
    },
    onSuccess(data, variables) {
      queryClient.invalidateQueries({ queryKey: queryKeys.extensions.all });
      // O bind cria/altera o campo de visibilidade e refaz o filtro das rows —
      // tabelas e registros em cache ficam desatualizados.
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
