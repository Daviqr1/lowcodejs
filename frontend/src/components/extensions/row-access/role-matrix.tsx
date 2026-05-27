import React from 'react';

import { ROLE_LABEL, ROW_ACCESS_ROLES } from './types';
import type { RowAccessRole } from './types';

import { Checkbox } from '@/components/ui/checkbox';

interface RoleMatrixProps {
  values: Array<string>;
  matrix: Record<string, Array<RowAccessRole>>;
  onChange: (matrix: Record<string, Array<RowAccessRole>>) => void;
  disabled?: boolean;
}

export function RoleMatrix({
  values,
  matrix,
  onChange,
  disabled,
}: RoleMatrixProps): React.JSX.Element {
  function toggle(value: string, role: RowAccessRole): void {
    const current = matrix[value] ?? [];
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    onChange({ ...matrix, [value]: next });
  }

  function isLocked(role: RowAccessRole): boolean {
    // MASTER e ADMINISTRATOR sempre marcados (anti-lockout)
    return role === 'MASTER' || role === 'ADMINISTRATOR';
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-3 py-2 text-left font-medium">Papel</th>
            {values.map((value) => (
              <th
                key={value}
                className="px-3 py-2 text-center font-mono text-xs font-medium"
              >
                {value}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROW_ACCESS_ROLES.map((role) => (
            <tr
              key={role}
              className="border-b last:border-b-0"
            >
              <td className="px-3 py-2 font-medium">{ROLE_LABEL[role]}</td>
              {values.map((value) => {
                const allowed = (matrix[value] ?? []).includes(role);
                const locked = isLocked(role);
                return (
                  <td
                    key={value}
                    className="px-3 py-2 text-center"
                  >
                    <Checkbox
                      checked={allowed || locked}
                      disabled={disabled || locked}
                      onCheckedChange={() => toggle(value, role)}
                      aria-label={`${ROLE_LABEL[role]} vê ${value}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-muted-foreground">
        MASTER e ADMINISTRATOR sempre habilitados (proteção anti-lockout).
      </p>
    </div>
  );
}
