import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { API } from '@/lib/api';

type ResolvePayload = {
  id: string;
  resolved: boolean;
};

type ResolveResult = {
  id: string;
  resolved: boolean;
};

type UseErrorLogResolveProps = {
  onSuccess?: (data: ResolveResult, variables: ResolvePayload) => void;
  onError?: (error: AxiosError | Error, variables: ResolvePayload) => void;
};

export function useErrorLogResolve(
  props: UseErrorLogResolveProps = {},
): UseMutationResult<ResolveResult, AxiosError | Error, ResolvePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ResolvePayload) => {
      const { data } = await API.patch<ResolveResult>(
        `/error-logs/${payload.id}/resolve`,
        { resolved: payload.resolved },
      );
      return data;
    },
    onSuccess(data, variables) {
      props.onSuccess?.(data, variables);
    },
    onError(error, variables) {
      props.onError?.(error, variables);
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: ['error-logs', 'list'] });
    },
  });
}
