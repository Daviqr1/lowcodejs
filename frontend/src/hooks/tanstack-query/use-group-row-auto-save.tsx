import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { API } from '@/lib/api';
import type { IRow } from '@/lib/interfaces';

export type GroupRowAutoSavePayload = {
  tableSlug: string;
  rowId: string;
  groupSlug: string;
  itemId?: string;
  data: Record<string, unknown>;
};

type UseAutoSaveGroupRowProps = {
  onSuccess?: (data: IRow, variables: GroupRowAutoSavePayload) => void;
  onError?: (error: AxiosError | Error) => void;
};

export function useAutoSaveGroupRow(
  props: UseAutoSaveGroupRowProps,
): UseMutationResult<IRow, AxiosError | Error, GroupRowAutoSavePayload> {
  return useMutation<IRow, AxiosError | Error, GroupRowAutoSavePayload>({
    mutationFn: async function (payload): Promise<IRow> {
      const base = `/tables/${payload.tableSlug}/rows/${payload.rowId}/groups/${payload.groupSlug}/auto-save`;
      let url = base;
      if (payload.itemId) {
        url = base.concat('?_id=').concat(payload.itemId);
      }
      const response = await API.patch<IRow>(url, payload.data);
      return response.data;
    },
    // NAO invalida cache a cada save: re-render do card faria piscar/perder
    // foco. A sincronizacao de cache acontece ao sair do formulario.
    onSuccess(data, variables): void {
      props.onSuccess?.(data, variables);
    },
    onError: props.onError,
  });
}
