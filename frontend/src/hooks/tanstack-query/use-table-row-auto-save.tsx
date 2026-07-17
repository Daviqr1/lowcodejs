import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { API } from '@/lib/api';
import type { IRow, Merge } from '@/lib/interfaces';
import type { RowAutoSavePayload } from '@/lib/payloads';

type UseAutoSaveTableRowProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<IRow, AxiosError | Error, RowAutoSavePayload, unknown>,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    onSuccess?: (data: IRow, variables: RowAutoSavePayload) => void;
  }
>;

export function useAutoSaveTableRow(
  props: UseAutoSaveTableRowProps,
): UseMutationResult<IRow, AxiosError | Error, RowAutoSavePayload> {
  return useMutation({
    mutationFn: async function (payload: RowAutoSavePayload): Promise<IRow> {
      const base = '/tables/'.concat(payload.slug).concat('/rows/auto-save');
      let url = base;
      if (payload.rowId) {
        url = base.concat('?_id=').concat(payload.rowId);
      }
      const response = await API.patch<IRow>(url, payload.data);
      return response.data;
    },
    // NAO escreve no cache da query de detalhe aqui: isso re-renderizava o
    // form aberto a cada save (pisca, perde foco, fecha modal). A sincronizacao
    // de cache acontece uma unica vez ao sair do form.
    onSuccess(data, variables): void {
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
