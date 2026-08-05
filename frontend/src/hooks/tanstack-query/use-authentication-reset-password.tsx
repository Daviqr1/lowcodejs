import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { API } from '@/lib/api';
import type { ResetPasswordPayload } from '@/lib/payloads';
import { getQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/authentication';

type UseAuthenticationResetPasswordProps = Pick<
  Omit<
    UseMutationOptions<void, AxiosError | Error, ResetPasswordPayload, unknown>,
    'mutationFn'
  >,
  'onSuccess' | 'onError'
>;

export function useAuthenticationResetPassword(
  props: UseAuthenticationResetPasswordProps,
): UseMutationResult<void, AxiosError | Error, ResetPasswordPayload> {
  return useMutation({
    mutationFn: async function (payload: ResetPasswordPayload) {
      await API.put('/authentication/recovery/update-password', payload);
      useAuthStore.getState().clear();
      getQueryClient().clear();
    },
    ...props,
  });
}
