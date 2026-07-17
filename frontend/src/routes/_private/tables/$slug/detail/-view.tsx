import React from 'react';

import { Badge } from '@/components/ui/badge';
import { useGroupReadList } from '@/hooks/tanstack-query/use-group-read-list';
import { useUserReadPaginatedInfinite } from '@/hooks/tanstack-query/use-user-read-paginated-infinite';
import {
  E_PERMISSION_TARGET,
  E_USER_STATUS,
  PERMISSION_LABEL_MAPPER,
  TABLE_PERMISSION_ACTIONS,
  TABLE_PROFILE_MAPPER,
  TABLE_STYLE_OPTIONS,
} from '@/lib/constant';
import type { IPermissionBinding, ITable } from '@/lib/interfaces';

type TableViewProps = {
  data: ITable;
};

// Rótulo legível de um binding (Grupo|Público|Ninguém) para exibição.
function bindingLabel(
  binding: IPermissionBinding | undefined,
  groupNameById: Map<string, string>,
): string {
  if (!binding) return 'Ninguém';
  if (binding.kind === E_PERMISSION_TARGET.PUBLIC) return 'Público';
  if (binding.kind === E_PERMISSION_TARGET.NOBODY) return 'Ninguém';
  if (!binding.group) return 'Ninguém';
  return groupNameById.get(binding.group) ?? binding.group;
}

export function TableView({ data }: TableViewProps): React.JSX.Element {
  const styleLabel =
    TABLE_STYLE_OPTIONS.find((opt) => opt.value === data.style)?.label ||
    data.style;

  const members = data.members ?? [];

  const groups = useGroupReadList();
  const groupNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups.data ?? []) {
      map.set(group._id, group.name);
    }
    return map;
  }, [groups.data]);

  const users = useUserReadPaginatedInfinite({
    perPage: 50,
    status: E_USER_STATUS.ACTIVE,
  });
  const userNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const page of users.data?.pages ?? []) {
      for (const user of page.data) {
        map.set(user._id, user.name);
      }
    }
    return map;
  }, [users.data?.pages]);

  return (
    <React.Fragment>
      <section
        className="space-y-4 p-2"
        data-test-id="table-detail-view"
      >
        {/* Logo */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Logo</p>
          {data.logo?.url && (
            <img
              src={data.logo.url}
              alt={data.logo.filename || 'Logo da tabela'}
              className="h-16 w-auto border rounded"
            />
          )}
          {!data.logo?.url && (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>

        {/* Nome */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Nome</p>
          <p className="text-sm text-muted-foreground">{data.name || '-'}</p>
        </div>

        {/* Descrição */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Descrição</p>
          <p className="text-sm text-muted-foreground">
            {data.description || '-'}
          </p>
        </div>

        {/* Layout de visualização */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Layout de visualização</p>
          <p className="text-sm text-muted-foreground">{styleLabel}</p>
        </div>

        {/* Permissões da tabela (Grupo | Público | Ninguém por ação) */}
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Permissões da tabela</p>
          {TABLE_PERMISSION_ACTIONS.map((action) => (
            <div
              key={action}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-sm text-muted-foreground">
                {PERMISSION_LABEL_MAPPER[action] ?? action}
              </span>
              <Badge variant="secondary">
                {bindingLabel(data.permissions?.[action], groupNameById)}
              </Badge>
            </div>
          ))}
        </div>

        {/* Dono */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Dono</p>
          <p className="text-sm text-muted-foreground">
            {data.owner?.name || '-'}
          </p>
        </div>

        {/* Convidados (perfis de colaboração) */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Convidados</p>
          {members.length > 0 && (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.user}
                  className="flex items-center justify-between gap-3 rounded-md border p-2"
                >
                  <span className="truncate text-sm">
                    {userNameById.get(member.user) ?? member.user}
                  </span>
                  <Badge variant="secondary">
                    {TABLE_PROFILE_MAPPER[member.profile] ?? member.profile}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">-</p>
          )}
        </div>

        {/* Ordenação padrão */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Ordenação padrão</p>
          <p className="text-sm text-muted-foreground">
            {(data.order &&
              `${data.fields?.find((f) => f.slug === data.order?.field)?.name ?? data.order.field} (${(data.order.direction === 'asc' && 'Ascendente') || 'Descendente'})`) ||
              '-'}
          </p>
        </div>
      </section>
    </React.Fragment>
  );
}
