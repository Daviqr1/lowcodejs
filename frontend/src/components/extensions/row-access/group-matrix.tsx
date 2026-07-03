import React from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import type { IGroup } from '@/lib/interfaces';

interface GroupMatrixProps {
  values: Array<string>;
  /** value → groupIds que podem ver aquele valor */
  matrix: Record<string, Array<string>>;
  groups: Array<IGroup>;
  onChange: (matrix: Record<string, Array<string>>) => void;
  disabled?: boolean;
}

/**
 * Matriz valor×grupo: linhas = valores de visibilidade, colunas = grupos reais do sistema.
 * Cada célula = checkbox marcando se aquele grupo vê aquele valor.
 *
 * Nota: MASTER e ADMINISTRATOR são bypassados no backend — não há necessidade
 * de forçá-los aqui. A nota informativa abaixo deixa isso claro ao usuário.
 */
export function GroupMatrix({
  values,
  matrix,
  groups,
  onChange,
  disabled,
}: GroupMatrixProps): React.JSX.Element {
  function toggle(value: string, groupId: string): void {
    const current = matrix[value] ?? [];
    let next = [...current, groupId];
    if (current.includes(groupId)) {
      next = current.filter((id) => id !== groupId);
    }
    onChange({ ...matrix, [value]: next });
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum grupo encontrado. Crie grupos em{' '}
        <span className="font-mono">/groups</span> para configurar a matriz.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-3 py-2 text-left font-medium">Grupo</th>
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
          {groups.map((group) => (
            <tr
              key={group._id}
              className="border-b last:border-b-0"
            >
              <td className="px-3 py-2 font-medium">
                <span
                  className="truncate max-w-[160px] block"
                  title={group.name}
                >
                  {group.name}
                </span>
              </td>
              {values.map((value) => {
                const allowed = (matrix[value] ?? []).includes(group._id);
                return (
                  <td
                    key={value}
                    className="px-3 py-2 text-center"
                  >
                    <Checkbox
                      checked={allowed}
                      disabled={disabled}
                      onCheckedChange={() => toggle(value, group._id)}
                      aria-label={`Grupo "${group.name}" vê ${value}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-muted-foreground">
        MASTER e ADMINISTRATOR sempre têm acesso a todos os valores (bypass no
        backend — não é necessário marcar aqui).
      </p>
    </div>
  );
}
