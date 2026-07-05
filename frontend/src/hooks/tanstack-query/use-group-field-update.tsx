import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IField, ITable, Paginated } from '@/lib/interfaces';

type GroupFieldUpdatePayload = {
  tableSlug: string;
  groupSlug: string;
  fieldId: string;
  data: Partial<IField> & {
    trashed?: boolean;
    trashedAt?: string | null;
  };
};

type UseGroupFieldUpdateProps = {
  onSuccess?: (data: IField) => void;
  onError?: (error: AxiosError | Error) => void;
};

export function useGroupFieldUpdate(
  props: UseGroupFieldUpdateProps,
): UseMutationResult<IField, AxiosError | Error, GroupFieldUpdatePayload> {
  const queryClient = useQueryClient();

  return useMutation<IField, AxiosError | Error, GroupFieldUpdatePayload>({
    mutationFn: async (payload) => {
      const route = `/tables/${payload.tableSlug}/groups/${payload.groupSlug}/fields/${payload.fieldId}`;
      const response = await API.put<IField>(route, payload.data);
      return response.data;
    },
    onSuccess(response, variables) {
      // Update field detail cache
      queryClient.setQueryData<IField>(
        queryKeys.groupFields.detail(
          variables.tableSlug,
          variables.groupSlug,
          variables.fieldId,
        ),
        response,
      );

      // Update table detail cache
      queryClient.setQueryData<ITable>(
        queryKeys.tables.detail(variables.tableSlug),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            groups: old.groups.map((g) => {
              if (g.slug !== variables.groupSlug) return g;
              return {
                ...g,
                fields: g.fields.map((f) => {
                  if (f._id === response._id) return response;
                  return f;
                }),
              };
            }),
          };
        },
      );

      // Update paginated table cache
      queryClient.setQueryData<Paginated<ITable>>(
        queryKeys.tables.list({ page: 1, perPage: 50 }),
        (old) => {
          if (!old) return old;
          return {
            meta: old.meta,
            data: old.data.map((t) => {
              if (t.slug === variables.tableSlug) {
                return {
                  ...t,
                  groups: t.groups.map((g) => {
                    if (g.slug !== variables.groupSlug) return g;
                    return {
                      ...g,
                      fields: g.fields.map((f) => {
                        if (f._id === response._id) return response;
                        return f;
                      }),
                    };
                  }),
                };
              }
              return t;
            }),
          };
        },
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.detail(variables.tableSlug),
      });

      props.onSuccess?.(response);
    },
    onError: props.onError,
  });
}
