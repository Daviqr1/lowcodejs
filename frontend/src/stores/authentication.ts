import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { IUser } from '@/lib/interfaces';

type AuthStore = {
  user: IUser | null;
  accounts: Array<IUser>;
  activeAccountId: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  setUser: (user: IUser | null) => void;
  setAccounts: (
    accounts: Array<IUser>,
    activeAccountId?: string | null,
  ) => void;
  setActiveAccount: (user: IUser) => void;
  removeAccount: (accountId: string) => void;
  clear: () => void;
};

function upsertAccount(accounts: Array<IUser>, user: IUser): Array<IUser> {
  const exists = accounts.some((account) => account._id === user._id);
  if (!exists) return [...accounts, user];

  return accounts.map((account) => {
    if (account._id === user._id) return user;
    return account;
  });
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accounts: [],
      activeAccountId: null,
      isAuthenticated: false,
      hasHydrated: false,

      setHasHydrated: (val: boolean): void => {
        set({ hasHydrated: val });
      },

      setUser: (user: IUser | null): void => {
        set((state) => {
          let accounts = state.accounts;
          if (user) accounts = upsertAccount(state.accounts, user);
          return {
            user,
            activeAccountId: user?._id ?? null,
            accounts,
            isAuthenticated: Boolean(user),
          };
        });
      },

      setAccounts: (
        accounts: Array<IUser>,
        activeAccountId?: string | null,
      ): void => {
        const nextActiveAccountId = activeAccountId ?? accounts[0]?._id ?? null;
        const activeUser =
          accounts.find((account) => account._id === nextActiveAccountId) ??
          accounts[0] ??
          null;

        set({
          accounts,
          activeAccountId: activeUser?._id ?? null,
          user: activeUser,
          isAuthenticated: Boolean(activeUser),
        });
      },

      setActiveAccount: (user: IUser): void => {
        set((state) => ({
          user,
          activeAccountId: user._id,
          accounts: upsertAccount(state.accounts, user),
          isAuthenticated: true,
        }));
      },

      removeAccount: (accountId: string): void => {
        set((state) => {
          const accounts = state.accounts.filter(
            (account) => account._id !== accountId,
          );
          let activeUser = state.user;
          if (state.activeAccountId === accountId) {
            activeUser = accounts[0] ?? null;
          }

          return {
            accounts,
            user: activeUser,
            activeAccountId: activeUser?._id ?? null,
            isAuthenticated: Boolean(activeUser),
          };
        });
      },

      clear(): void {
        set({
          user: null,
          accounts: [],
          activeAccountId: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'low-code-js-auth',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: (): string | null => null,
            setItem: (): void => {},
            removeItem: (): void => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        accounts: state.accounts,
        activeAccountId: state.activeAccountId,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage:
        (): ((state?: AuthStore) => void) =>
        (state): void => {
          state?.setHasHydrated(true);
        },
    },
  ),
);
