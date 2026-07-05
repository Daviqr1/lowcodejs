import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import type { IEvaluationSummary, IRow } from '@/lib/interfaces';
import type { RowEvaluationPayload } from '@/lib/payloads';

type UseRowUpdateEvaluationProps = {
  onSuccess?: (data: IRow, variables: RowEvaluationPayload) => void;
  onError?: (
    error: AxiosError | Error,
    variables: RowEvaluationPayload,
  ) => void;
};

export function useRowUpdateEvaluation(
  props: UseRowUpdateEvaluationProps = {},
): UseMutationResult<
  IRow,
  AxiosError | Error,
  RowEvaluationPayload,
  { previous?: IRow }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: RowEvaluationPayload) {
      const route = '/tables/'
        .concat(payload.tableSlug)
        .concat('/rows/')
        .concat(payload.rowId)
        .concat('/evaluation');
      const response = await API.post<IRow>(route, {
        field: payload.field,
        value: payload.value,
      });
      return response.data;
    },
    async onMutate(variables) {
      const key = queryKeys.rows.detail(variables.tableSlug, variables.rowId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<IRow>(key);

      if (previous) {
        const rawCurrent = previous[variables.field];
        let current: IEvaluationSummary = {
          _average: 0,
          _count: 0,
          _userValue: null,
        };
        if (
          rawCurrent &&
          typeof rawCurrent === 'object' &&
          '_average' in rawCurrent
        )
          current = rawCurrent;
        const oldCount = current._count ?? 0;
        const oldAverage = current._average ?? 0;
        const oldUserValue = current._userValue;

        let newCount = oldCount;
        let newAverage = oldAverage;

        if (oldUserValue === null || oldUserValue === undefined) {
          newCount = oldCount + 1;
          newAverage = (oldAverage * oldCount + variables.value) / newCount;
        } else {
          const totalSum = oldAverage * oldCount;
          newAverage = (totalSum - oldUserValue + variables.value) / oldCount;
        }

        const summary: IEvaluationSummary = {
          _average: newAverage,
          _count: newCount,
          _userValue: variables.value,
        };

        queryClient.setQueryData<IRow>(key, {
          ...previous,
          [variables.field]: summary,
        });
      }

      return { previous };
    },
    onError(_err, variables, context) {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.rows.detail(variables.tableSlug, variables.rowId),
          context.previous,
        );
      }
      props.onError?.(_err, variables);
    },
    onSuccess(data, variables) {
      queryClient.setQueryData(
        queryKeys.rows.detail(variables.tableSlug, variables.rowId),
        data,
      );
      props.onSuccess?.(data, variables);
    },
    onSettled(_data, _err, variables) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.rows.lists(variables.tableSlug),
      });
    },
  });
}
