import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { API } from '@/lib/api';
import type { IAuthenticationAccounts } from '@/lib/interfaces';
import { useAuthStore } from '@/stores/authentication';

type SignOutPayload = { all?: boolean } | void;
type SignOutResponse = { message: string; activeAccountId: string | null };

type UseAuthenticationSignOutProps = Pick<
  Omit<
    UseMutationOptions<
      SignOutResponse,
      AxiosError | Error,
      SignOutPayload,
      unknown
    >,
    'mutationFn'
  >,
  'onSuccess' | 'onError'
>;

export function useAuthenticationSignOut(
  props: UseAuthenticationSignOutProps,
): UseMutationResult<
  SignOutResponse,
  AxiosError | Error,
  SignOutPayload,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function (payload?: SignOutPayload) {
      const response = await API.post<SignOutResponse>(
        '/authentication/sign-out',
        payload ?? {},
      );
      queryClient.clear();

      if (!response.data.activeAccountId) {
        useAuthStore.getState().clear();
        return response.data;
      }

      const accountsResponse = await API.get<IAuthenticationAccounts>(
        '/authentication/accounts',
      );

      useAuthStore
        .getState()
        .setAccounts(
          accountsResponse.data.accounts,
          accountsResponse.data.activeAccountId,
        );

      return response.data;
    },
    ...props,
  });
}
