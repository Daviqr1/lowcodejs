import * as React from 'react';

import { UserMultiSelect } from '@/components/common/selectors/user-multi-select';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserReadPaginatedInfinite } from '@/hooks/tanstack-query/use-user-read-paginated-infinite';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import {
  E_TABLE_PROFILE,
  E_USER_STATUS,
  TABLE_PROFILE_MAPPER,
} from '@/lib/constant';
import type { ITableMember } from '@/lib/interfaces';

// Perfis atribuíveis a um convidado (OWNER é controlado pela troca de dono).
const GUEST_PROFILES = [
  E_TABLE_PROFILE.ADMIN,
  E_TABLE_PROFILE.EDITOR,
  E_TABLE_PROFILE.CONTRIBUTOR,
  E_TABLE_PROFILE.VIEWER,
];

type FieldTableMembersProps = {
  label: string;
  disabled?: boolean;
};

export function FieldTableMembers({
  label,
  disabled,
}: FieldTableMembersProps): React.JSX.Element {
  const field = useFieldContext<Array<ITableMember>>();
  const members = field.state.value ?? [];

  // Mapa id -> nome para rotular cada convidado (melhor esforço: usuários ativos).
  const { data } = useUserReadPaginatedInfinite({
    perPage: 50,
    status: E_USER_STATUS.ACTIVE,
  });
  const nameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const page of data?.pages ?? []) {
      for (const user of page.data) {
        map.set(user._id, user.name);
      }
    }
    return map;
  }, [data?.pages]);

  const userIds = members.map((member) => member.user);

  function handleUsersChange(ids: Array<string>): void {
    const byId = new Map(members.map((member) => [member.user, member]));
    const next: Array<ITableMember> = ids.map((id) => {
      const existing = byId.get(id);
      if (existing) return existing;
      return { user: id, profile: E_TABLE_PROFILE.VIEWER };
    });
    field.handleChange(next);
  }

  function handleProfileChange(userId: string, profileValue: string): void {
    const profile = GUEST_PROFILES.find((option) => option === profileValue);
    if (!profile) return;
    const next = members.map((member) => {
      if (member.user !== userId) return member;
      return { ...member, profile };
    });
    field.handleChange(next);
  }

  return (
    <Field
      data-slot="field-table-members"
      data-test-id="field-table-members"
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <FieldDescription>
        Convidados têm acesso à tabela conforme o perfil escolhido.
      </FieldDescription>
      <UserMultiSelect
        disabled={disabled}
        value={userIds}
        onValueChange={handleUsersChange}
        placeholder="Adicione convidados..."
      />
      {members.length > 0 && (
        <div className="mt-2 space-y-2">
          {members.map((member) => (
            <div
              key={member.user}
              className="flex items-center justify-between gap-3 rounded-md border p-2"
            >
              <span className="truncate text-sm">
                {nameById.get(member.user) ?? member.user}
              </span>
              <Select
                value={member.profile}
                onValueChange={(profile) =>
                  handleProfileChange(member.user, profile)
                }
                disabled={disabled}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GUEST_PROFILES.map((profile) => (
                    <SelectItem
                      key={profile}
                      value={profile}
                    >
                      {TABLE_PROFILE_MAPPER[profile]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </Field>
  );
}
