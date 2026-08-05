import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import type { IUser } from '@/lib/interfaces';

/**
 * Usuario da sessao para uso dentro de `beforeLoad`.
 *
 * Le do QueryClient da requisicao — populado por `_private/layout.tsx` via
 * `ensureQueryData(profileDetailOptions())` — e nao do store zustand.
 *
 * O store persiste no localStorage do navegador e por isso esta sempre vazio
 * durante o SSR. Como `beforeLoad` roda no servidor num hard load, todo gate de
 * capacidade negava acesso: um MASTER que abrisse `/users` por URL, bookmark ou
 * reload caia em `/tables`. O mesmo valia para `/groups`, `/menus`, `/settings`
 * e `/extensions`.
 */
export function getSessionUser(queryClient: QueryClient): IUser | undefined {
  return queryClient.getQueryData<IUser>(queryKeys.profile.all);
}
