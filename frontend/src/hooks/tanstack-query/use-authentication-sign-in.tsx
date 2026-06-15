import type {
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { API } from '@/lib/api';
import type { IAuthenticationAccounts, IUser } from '@/lib/interfaces';
import type { SignInPayload } from '@/lib/payloads';
import { useAuthStore } from '@/stores/authentication';

type UseAuthenticationSignInProps = Pick<
  Omit<
    UseMutationOptions<IUser, AxiosError | Error, SignInPayload, unknown>,
    'mutationFn'
  >,
  'onSuccess' | 'onError'
>;

export function useAuthenticationSignIn(
  props: UseAuthenticationSignInProps,
): UseMutationResult<IUser, AxiosError | Error, SignInPayload> {
  return useMutation({
    mutationFn: async function (payload: SignInPayload) {
      await API.post('/authentication/sign-in', payload);
      const response = await API.get<IUser>('/profile');
      const accountsResponse = await API.get<IAuthenticationAccounts>(
        '/authentication/accounts',
      );
      const user = response.data;
      useAuthStore
        .getState()
        .setAccounts(accountsResponse.data.accounts, user._id);
      return user;
    },
    ...props,
  });
}
