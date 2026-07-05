import { useMemo } from 'react';

import { useGroupReadList } from './tanstack-query/use-group-read-list';
import { useProfileRead } from './tanstack-query/use-profile-read';

import { E_PERMISSION_TARGET, E_TABLE_PROFILE } from '@/lib/constant';
import type { ITable } from '@/lib/interfaces';
import {
  isPrivileged,
  resolveUserCapabilities,
  resolveUserGroupIds,
  userSatisfiesBinding,
} from '@/lib/permission';
import { useAuthStore } from '@/stores/authentication';

export type TableAction =
  | 'VIEW_TABLE'
  | 'UPDATE_TABLE'
  | 'REMOVE_TABLE'
  | 'CREATE_TABLE'
  | 'VIEW_FIELD'
  | 'CREATE_FIELD'
  | 'UPDATE_FIELD'
  | 'REMOVE_FIELD'
  | 'VIEW_ROW'
  | 'CREATE_ROW'
  | 'UPDATE_ROW'
  | 'REMOVE_ROW';

type UseTablePermissionResult = {
  isOwner: boolean;
  isAdmin: boolean;
  isOwnerOrAdmin: boolean;
  can: (action: TableAction) => boolean;
  isLoading: boolean;
};

/**
 * Hook para verificar permissões de tabela (gating de UX no client).
 *
 * O backend é a fonte de verdade e enforça tudo (inclusive "apenas as próprias
 * rows" para contributor). Aqui fazemos um gating coarse:
 * 1. Privilegiado (MASTER/ADMINISTRATOR, dono, ou membro ADMIN/OWNER) -> tudo.
 * 2. Caso contrário -> avalia o binding da ação contra o fecho de grupos do
 *    usuário (`table.permissions[action]`: PUBLIC libera, GROUP exige o grupo no
 *    fecho, NOBODY/ausente nega).
 */
export function useTablePermission(
  table: ITable | undefined,
): UseTablePermissionResult {
  const auth = useAuthStore();
  const profile = useProfileRead();
  const groups = useGroupReadList();

  const userId = auth.user?._id;

  const isOwner = useMemo(() => {
    if (!table || !userId) return false;
    // owner pode vir ausente/null (tabela recém-criada ou resposta sem populate)
    // — nunca desreferenciar direto, senão estoura em render.
    if (table.owner) {
      let ownerId: string | null = null;
      if (typeof table.owner === 'string') ownerId = table.owner;
      if (typeof table.owner === 'object') ownerId = table.owner._id;
      if (ownerId === userId) return true;
    }
    return Boolean(
      table.members?.some(
        (member) =>
          member.user === userId && member.profile === E_TABLE_PROFILE.OWNER,
      ),
    );
  }, [table, userId]);

  const isAdmin = useMemo(() => {
    if (!table || !userId) return false;
    return Boolean(
      table.members?.some(
        (member) =>
          member.user === userId && member.profile === E_TABLE_PROFILE.ADMIN,
      ),
    );
  }, [table, userId]);

  const isOwnerOrAdmin = isOwner || isAdmin;

  const userGroupIds = useMemo(() => {
    return resolveUserGroupIds(profile.data ?? null, groups.data ?? []);
  }, [profile.data, groups.data]);

  const capabilities = useMemo(
    () => resolveUserCapabilities(profile.data ?? null, groups.data ?? []),
    [profile.data, groups.data],
  );

  const privileged = useMemo(
    () => isPrivileged(profile.data ?? null, groups.data ?? []),
    [profile.data, groups.data],
  );

  const can = useMemo(() => {
    return (action: TableAction): boolean => {
      // Privilegiados têm acesso total no client (backend reconfirma).
      if (privileged || isOwnerOrAdmin) return true;

      // Sem o mapa de permissões (tabela ainda não backfillada): só privilegiado.
      if (!table?.permissions) return false;

      const binding = table.permissions[action];
      // Ausente => negado (espelha o backend, que nega ação sem binding).
      if (!binding) return false;

      // PUBLIC libera todos (inclui visitante), sem exigir capacidade.
      if (binding.kind === E_PERMISSION_TARGET.PUBLIC) return true;

      // Interseção (espelha o backend): GROUP exige a capacidade global da ação
      // no fecho de grupos E o grupo do binding no fecho.
      if (!capabilities.has(action)) return false;

      return userSatisfiesBinding(binding, userGroupIds);
    };
  }, [privileged, isOwnerOrAdmin, table, userGroupIds, capabilities]);

  return {
    isOwner,
    isAdmin,
    isOwnerOrAdmin,
    can,
    isLoading: profile.status === 'pending',
  };
}

/**
 * Hook para verificar permissões sem tabela específica (ex: CREATE_TABLE)
 * Usa apenas permissões do grupo do usuário
 */
export function usePermission(): {
  can: (action: TableAction) => boolean;
  isLoading: boolean;
} {
  const profile = useProfileRead();
  const groups = useGroupReadList();

  const privileged = useMemo(
    () => isPrivileged(profile.data ?? null, groups.data ?? []),
    [profile.data, groups.data],
  );

  // Capacidades do fecho de grupos (grupo principal + adicionais + englobados),
  // espelhando o `resolveCapabilities` do backend. Antes só o grupo principal
  // era considerado e o slug era comparado em kebab-case (nunca casava com o
  // slug UPPER_SNAKE do backend) — por isso o botão "Nova Tabela" não aparecia.
  const capabilities = useMemo(
    () => resolveUserCapabilities(profile.data ?? null, groups.data ?? []),
    [profile.data, groups.data],
  );

  const can = useMemo(() => {
    return (action: TableAction): boolean => {
      // Privilegiado (MASTER/ADMINISTRATOR no fecho) tem acesso total.
      if (privileged) return true;

      // TableAction == slug da permissão (UPPER_SNAKE), igual ao backend.
      return capabilities.has(action);
    };
  }, [privileged, capabilities]);

  return {
    can,
    isLoading: profile.status === 'pending',
  };
}
