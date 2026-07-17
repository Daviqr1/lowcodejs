import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { queryKeys } from './_query-keys';

import { API } from '@/lib/api';
import { E_REACTION_TYPE } from '@/lib/constant';
import type { IReactionSummary, IRow } from '@/lib/interfaces';
import type { RowReactionPayload } from '@/lib/payloads';

type UseRowUpdateReactionProps = {
  onSuccess?: (data: IRow, variables: RowReactionPayload) => void;
  onError?: (error: AxiosError | Error, variables: RowReactionPayload) => void;
};

export function useRowUpdateReaction(
  props: UseRowUpdateReactionProps = {},
): UseMutationResult<
  IRow,
  AxiosError | Error,
  RowReactionPayload,
  { previous?: IRow }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload: RowReactionPayload) {
      const route = '/tables/'
        .concat(payload.tableSlug)
        .concat('/rows/')
        .concat(payload.rowId)
        .concat('/reaction');
      const response = await API.post<IRow>(route, {
        field: payload.field,
        type: payload.type,
      });
      return response.data;
    },
    async onMutate(variables) {
      const key = queryKeys.rows.detail(variables.tableSlug, variables.rowId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<IRow>(key);

      if (previous) {
        const rawCurrent = previous[variables.field];
        let current: IReactionSummary = {
          _likeCount: 0,
          _unlikeCount: 0,
          _userReaction: null,
        };
        if (
          rawCurrent &&
          typeof rawCurrent === 'object' &&
          '_likeCount' in rawCurrent
        )
          current = rawCurrent;
        let likeCount = current._likeCount ?? 0;
        let unlikeCount = current._unlikeCount ?? 0;
        const oldReaction = current._userReaction;

        if (oldReaction === E_REACTION_TYPE.LIKE) {
          likeCount--;
        } else if (oldReaction === E_REACTION_TYPE.UNLIKE) {
          unlikeCount--;
        }

        if (variables.type === E_REACTION_TYPE.LIKE) {
          likeCount++;
        } else if (variables.type === E_REACTION_TYPE.UNLIKE) {
          unlikeCount++;
        }

        const summary: IReactionSummary = {
          _likeCount: likeCount,
          _unlikeCount: unlikeCount,
          _userReaction: variables.type,
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
