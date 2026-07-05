import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IField, ITable, Merge } from '@/lib/interfaces';

type FieldCreatePayload = Merge<
  Partial<IField>,
  {
    group?: { slug: string } | string | null;
  }
>;

type UseFieldCreateProps = Merge<
  Pick<
    Omit<
      UseMutationOptions<IField, AxiosError | Error, FieldCreatePayload>,
      'mutationFn' | 'onSuccess'
    >,
    'onError'
  >,
  {
    slug: string;
    onSuccess?: (data: IField) => void;
  }
>;

export function useFieldCreate(
  props: UseFieldCreateProps,
): UseMutationResult<IField, AxiosError | Error, FieldCreatePayload> {
  const queryClient = useQueryClient();
  const { slug } = props;

  return useMutation({
    mutationFn: async (payload: FieldCreatePayload) => {
      const response = await API.post<IField>(
        `/tables/${slug}/fields`,
        payload,
      );
      return response.data;
    },
    onSuccess(response) {
      queryClient.setQueryData<ITable>(queryKeys.tables.detail(slug), (old) => {
        if (!old) return old;

        return {
          ...old,
          fields: [...old.fields, response],
          fieldOrderForm: [...(old.fieldOrderForm ?? []), response._id],
          fieldOrderList: [...(old.fieldOrderList ?? []), response._id],
          fieldOrderFilter: [...(old.fieldOrderFilter ?? []), response._id],
          fieldOrderDetail: [...(old.fieldOrderDetail ?? []), response._id],
        };
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.tables.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(slug),
      });

      props.onSuccess?.(response);
    },
    onError: props.onError,
  });
}
