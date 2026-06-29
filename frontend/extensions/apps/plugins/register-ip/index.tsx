import { GlobeIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { API } from '@/lib/api';
import type { IRow, ITable } from '@/lib/interfaces';

interface Props {
  /** Tabela em foco. Recebida via context do `<ExtensionSlot id="table.row.actions">`. */
  table?: ITable;
  /** Registro da linha onde o dropdown foi aberto. */
  row: IRow;
  /** Slug da tabela atual. */
  slug: string;
}

export default function RegisterIpPlugin({
  row,
  slug,
}: Props): React.JSX.Element {
  async function handleRegister(): Promise<void> {
    try {
      // O IP real é resolvido no backend (a partir do request); o front só
      // dispara a ação. A gravação é direta na linha, no campo oculto "ip".
      const { data } = await API.post<{ ip: string }>(
        `/plugins/register-ip/${slug}/${row._id}`,
      );
      toast.success('IP registrado', {
        description: `IP ${data.ip} gravado no registro.`,
      });
    } catch {
      toast.error('Não foi possível registrar o IP', {
        description:
          'Confirme que a tabela tem o campo "ip" e que você pode editar o registro.',
      });
    }
  }

  return (
    <DropdownMenuItem
      className="inline-flex space-x-1 w-full cursor-pointer"
      onSelect={(event) => {
        event.preventDefault();
        void handleRegister();
      }}
      data-test-id="plugin-register-ip"
    >
      <GlobeIcon className="size-4" />
      <span>Registrar IP</span>
    </DropdownMenuItem>
  );
}
