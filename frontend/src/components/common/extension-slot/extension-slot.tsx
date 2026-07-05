import React, { Suspense } from 'react';

import { useExtensionsActiveList } from '@/hooks/tanstack-query/use-extensions-active-list';
import type { IActiveExtension } from '@/hooks/tanstack-query/use-extensions-active-list';
import { E_EXTENSION_TYPE } from '@/lib/constant';
import { loadExtensionEntry } from '@/lib/extensions-registry';
import type { ExtensionEntryType } from '@/lib/extensions-registry';

function extensionTypeToFolder(type: string): ExtensionEntryType {
  if (type === E_EXTENSION_TYPE.MODULE) return 'modules';
  if (type === E_EXTENSION_TYPE.TOOL) return 'tools';
  return 'plugins';
}

/**
 * Contexto entregue aos plugins. Cada slot define quais campos vai povoar —
 * ver tabela em `backend/extensions/CLAUDE.md` (seção "Catálogo de slots").
 * Mantém-se genérico para permitir slots futuros sem alterar este componente.
 */
export type ExtensionSlotContext = Record<string, unknown>;

type ExtensionSlotProps = {
  /** Identificador do slot (ex: "table.actions"). O plugin é renderizado se este id estiver em `placement.slots` do manifest. */
  id: string;
  /** Props passadas como spread para o componente da extensão. */
  context?: ExtensionSlotContext;
};

function isPluginAllowedForTable(
  plugin: IActiveExtension,
  tableId: string | null,
): boolean {
  // Sem tabela em foco, slot global → permite qualquer plugin
  if (!tableId) return true;
  if (plugin.tableScope.mode === 'all') return true;
  return plugin.tableScope.tableIds.includes(tableId);
}

type ExtensionPluginRenderProps = {
  plugin: IActiveExtension;
  slot: string;
  context: ExtensionSlotContext;
};

function ExtensionPluginRender({
  plugin,
  slot,
  context,
}: ExtensionPluginRenderProps): React.JSX.Element {
  const Component = React.useMemo(() => {
    return React.lazy(async () => {
      const Entry = await loadExtensionEntry(
        plugin.pkg,
        extensionTypeToFolder(plugin.type),
        plugin.extensionId,
      );
      if (!Entry) {
        // Manifest registrado mas entry React não existe no bundle. Não quebra
        // o slot — só não renderiza nada.
        return { default: (): null => null };
      }
      return { default: Entry };
    });
  }, [plugin.pkg, plugin.extensionId]);

  return (
    <Suspense fallback={null}>
      <Component
        slot={slot}
        {...context}
      />
    </Suspense>
  );
}

/**
 * Renderiza todos os plugins ativados para o slot `id`. Filtragem por
 * `tableScope` é feita aqui dentro porque o `context` é quem sabe qual
 * tabela está em foco — mantém o hook `useExtensionsActiveList` simples e
 * reutilizável.
 */
export function ExtensionSlot({
  id,
  context = {},
}: ExtensionSlotProps): React.JSX.Element {
  const { data: extensions } = useExtensionsActiveList();

  const tableId = ((): string | null => {
    // context é um saco de props de slot (shape varia por slot) — narrow pontual.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const candidate = (context as { table?: { _id?: string } }).table;
    return candidate?._id ?? null;
  })();

  const plugins = React.useMemo(() => {
    return (extensions ?? []).filter((extension) => {
      if (!extension.slots.includes(id)) return false;
      return isPluginAllowedForTable(extension, tableId);
    });
  }, [extensions, id, tableId]);

  if (plugins.length === 0) return <></>;

  return (
    <>
      {plugins.map((plugin) => (
        <ExtensionPluginRender
          key={plugin._id}
          plugin={plugin}
          slot={id}
          context={context}
        />
      ))}
    </>
  );
}
