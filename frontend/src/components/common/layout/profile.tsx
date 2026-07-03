import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { Check, LogOut, User, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { menuAllOptions } from '@/hooks/tanstack-query/_query-options';
import { useAuthenticationSignOut } from '@/hooks/tanstack-query/use-authentication-sign-out';
import { useProfileRead } from '@/hooks/tanstack-query/use-profile-read';
import { API } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import type { IAuthenticationAccounts, IUser } from '@/lib/interfaces';
import { resolveInitialMenuRoute } from '@/lib/menu/initial-menu-route';
import { ROLE_DEFAULT_ROUTE } from '@/lib/menu/menu-access-permissions';
import { useAuthStore } from '@/stores/authentication';

type LogoutMode = 'current' | 'all';

const LOGOUT_COPY = {
  current: {
    title: 'Sair desta conta',
    description:
      'Você será desconectado desta conta. Outras contas ativas permanecem conectadas. Deseja continuar?',
    confirmLabel: 'Sair desta conta',
  },
  all: {
    title: 'Sair de todas as contas',
    description:
      'Você será desconectado de todas as contas ativas e voltará para a tela de login. Deseja continuar?',
    confirmLabel: 'Sair de todas',
  },
} satisfies Record<
  LogoutMode,
  { title: string; description: string; confirmLabel: string }
>;

const LOGOUT_PAYLOAD = {
  current: {},
  all: { all: true },
} satisfies Record<LogoutMode, { all?: boolean }>;

export function Profile(): React.JSX.Element {
  const user = useProfileRead();
  const accounts = useAuthStore((state) => state.accounts);
  const activeAccountId = useAuthStore((state) => state.activeAccountId);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(
    null,
  );
  const [logoutMode, setLogoutMode] = useState<LogoutMode | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const navigateToInitialRoute = async (nextUser: IUser): Promise<void> => {
    const role = nextUser.group.slug.toUpperCase();
    const fallbackRoute = ROLE_DEFAULT_ROUTE[role] ?? '/tables';
    const menus = await queryClient.fetchQuery(menuAllOptions());
    const initialRoute = resolveInitialMenuRoute(menus);

    if (initialRoute?.type === 'external') {
      window.location.assign(initialRoute.href);
      return;
    }

    router.navigate({
      to: initialRoute?.to ?? fallbackRoute,
      replace: true,
    });
  };

  const switchAccount = async (accountId: string): Promise<void> => {
    if (accountId === activeAccountId) return;

    const target = accounts.find((account) => account._id === accountId);

    try {
      setSwitchingAccountId(accountId);
      await API.post('/authentication/switch-account', { accountId });
      // O switch-account já reescreveu os cookies (accessToken + activeAccountId)
      // para a conta nova; o store é atualizado antes do clear só para a UI
      // refletir a troca imediatamente (avatar, nome).
      if (target) useAuthStore.getState().setActiveAccount(target);
      queryClient.clear();

      const accountsResponse = await API.get<IAuthenticationAccounts>(
        '/authentication/accounts',
      );
      useAuthStore
        .getState()
        .setAccounts(
          accountsResponse.data.accounts,
          accountsResponse.data.activeAccountId,
        );

      const profileResponse = await API.get<IUser>('/profile');
      useAuthStore.getState().setActiveAccount(profileResponse.data);
      toast.success('Conta alternada com sucesso!', {
        description: 'Sessão ativa atualizada.',
      });
      await navigateToInitialRoute(profileResponse.data);
    } catch (error) {
      handleApiError(error, { context: 'Erro ao alternar conta' });
    } finally {
      setSwitchingAccountId(null);
    }
  };

  const signOut = useAuthenticationSignOut({
    async onSuccess(response) {
      setLogoutMode(null);

      if (response.activeAccountId) {
        const nextUser = useAuthStore.getState().user;
        toast.success('Conta removida com sucesso!', {
          description: 'Outra conta segue ativa.',
        });
        if (nextUser) {
          await navigateToInitialRoute(nextUser);
        }
        return;
      }

      toast.success('Logout realizado com sucesso!', {
        description: 'Volte sempre!',
      });

      router.navigate({
        to: '/',
        replace: true,
      });
    },
    onError(error) {
      setLogoutMode(null);
      handleApiError(error, { context: 'Erro ao fazer logout' });
    },
  });

  return (
    <React.Fragment>
      <DropdownMenu
        data-slot="profile"
        data-test-id="profile-dropdown"
        modal={false}
      >
        <DropdownMenuTrigger asChild>
          <Button
            data-test-id="profile-btn"
            variant="ghost"
            className="h-8 w-8 rounded-full p-0"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-muted font-bold text-muted-foreground">
                {user.status === 'success' && getInitials(user.data.name)}
                {user.status !== 'success' && 'M'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56"
          align="end"
          forceMount
        >
          {user.status === 'success' && (
            <React.Fragment>
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.data.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.data.email}
                </p>
              </div>

              <DropdownMenuSeparator />

              {accounts.length > 0 && (
                <React.Fragment>
                  <DropdownMenuGroup>
                    {accounts.map((account) => {
                      const isActive = account._id === activeAccountId;

                      return (
                        <DropdownMenuItem
                          key={account._id}
                          data-test-id={`account-switch-${account._id}`}
                          onClick={() => switchAccount(account._id)}
                          className="cursor-pointer"
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className="text-[10px] bg-muted font-bold text-muted-foreground">
                              {getInitials(account.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate">
                            {account.name}
                          </span>
                          {switchingAccountId === account._id && <Spinner />}
                          {isActive && switchingAccountId !== account._id && (
                            <Check className="size-4 ml-2" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>

                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer"
                  >
                    <a
                      href="/?addAccount=1"
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="size-4 mr-2" />
                      <span>Adicionar conta</span>
                    </a>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                </React.Fragment>
              )}

              <DropdownMenuGroup>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer"
                >
                  <Link
                    to="/profile"
                    data-test-id="profile-link"
                    className="flex items-center gap-2"
                  >
                    <User className="size-4 mr-2" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                data-test-id="logout-btn"
                onClick={() => setLogoutMode('current')}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                {signOut.status !== 'pending' && (
                  <LogOut className="size-4 mr-2" />
                )}
                {signOut.status === 'pending' && <Spinner />}
                <span>Sair desta conta</span>
              </DropdownMenuItem>

              {accounts.length > 1 && (
                <DropdownMenuItem
                  data-test-id="logout-all-btn"
                  onClick={() => setLogoutMode('all')}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  {signOut.status !== 'pending' && (
                    <LogOut className="size-4 mr-2" />
                  )}
                  {signOut.status === 'pending' && <Spinner />}
                  <span>Sair de todas</span>
                </DropdownMenuItem>
              )}
            </React.Fragment>
          )}

          {user.status === 'pending' && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
              Carregando...
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {logoutMode && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setLogoutMode(null);
          }}
          icon={<LogOut className="size-4 text-destructive" />}
          title={LOGOUT_COPY[logoutMode].title}
          description={LOGOUT_COPY[logoutMode].description}
          confirmLabel={LOGOUT_COPY[logoutMode].confirmLabel}
          isPending={signOut.status === 'pending'}
          onConfirm={() => signOut.mutateAsync(LOGOUT_PAYLOAD[logoutMode])}
          testId="profile-logout-confirm-dialog"
          confirmTestId="profile-logout-confirm"
          cancelTestId="profile-logout-cancel"
        />
      )}
    </React.Fragment>
  );
}
