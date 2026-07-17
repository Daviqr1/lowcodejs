import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IField, ITable } from '@/lib/interfaces';

type GroupFieldCreatePayload = {
  tableSlug: string;
  groupSlug: string;
  data: Partial<IField>;
};

type UseGroupFieldCreateProps = {
  onSuccess?: (data: IField) => void;
  onError?: (error: AxiosError | Error) => void;
};

export function useGroupFieldCreate(
  props: UseGroupFieldCreateProps,
): UseMutationResult<IField, AxiosError | Error, GroupFieldCreatePayload> {
  const queryClient = useQueryClient();

  return useMutation<IField, AxiosError | Error, GroupFieldCreatePayload>({
    mutationFn: async (payload) => {
      const route = `/tables/${payload.tableSlug}/groups/${payload.groupSlug}/fields`;
      const response = await API.post<IField>(route, payload.data);
      return response.data;
    },
    onSuccess(response, variables) {
      queryClient.setQueryData<ITable>(
        queryKeys.tables.detail(variables.tableSlug),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            groups: old.groups.map((g) => {
              if (g.slug !== variables.groupSlug) return g;
              return { ...g, fields: [...g.fields, response] };
            }),
          };
        },
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(variables.tableSlug),
      });

      props.onSuccess?.(response);
    },
    onError: props.onError,
  });
}
