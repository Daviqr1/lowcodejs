import {
  LayoutGridIcon,
  ListIcon,
  LockIcon,
  PlusIcon,
  UsersIcon,
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { ChannelDialog } from './channel-dialog';
import { ChannelSidebar } from './channel-sidebar';
import { EntryDialog } from './entry-dialog';
import { EntryList } from './entry-list';
import type { SenhasView } from './entry-list';
import type { IPasswordChannel, IPasswordEntry } from './senhas-types';
import { refId } from './senhas-types';
import {
  useChannels,
  useDeleteChannel,
  useDeleteEntry,
  useEntries,
} from './use-senhas';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader, PageShell } from '@/components/common/page-shell';
import { LoadError } from '@/components/common/route-status/load-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { handleApiError } from '@/lib/handle-api-error';
import { useAuthStore } from '@/stores/authentication';

export default function SenhasModule(): React.JSX.Element {
  const currentUserId = useAuthStore((s) => s.user?._id ?? '');

  const channelsQuery = useChannels();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Visão principal = tabela (igual às demais aplicações); cards é alternativa.
  const [view, setView] = React.useState<SenhasView>('table');
  React.useEffect(() => {
    const stored = window.localStorage.getItem('senhas-view');
    if (stored === 'cards' || stored === 'table') setView(stored);
  }, []);
  function changeView(next: SenhasView): void {
    setView(next);
    window.localStorage.setItem('senhas-view', next);
  }

  // Dialog state — alvo (dado) + nonce p/ abrir por ref (uncontrolled).
  const [channelTarget, setChannelTarget] =
    React.useState<IPasswordChannel | null>(null);
  const [channelNonce, setChannelNonce] = React.useState(0);
  const channelTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [entryTarget, setEntryTarget] = React.useState<IPasswordEntry | null>(
    null,
  );
  const [entryNonce, setEntryNonce] = React.useState(0);
  const entryTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [channelToDelete, setChannelToDelete] =
    React.useState<IPasswordChannel | null>(null);
  const [channelDeleteNonce, setChannelDeleteNonce] = React.useState(0);
  const channelDeleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const [entryToDelete, setEntryToDelete] =
    React.useState<IPasswordEntry | null>(null);
  const [entryDeleteNonce, setEntryDeleteNonce] = React.useState(0);
  const entryDeleteTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (channelNonce > 0) channelTriggerRef.current?.click();
  }, [channelNonce]);
  React.useEffect(() => {
    if (entryNonce > 0) entryTriggerRef.current?.click();
  }, [entryNonce]);
  React.useEffect(() => {
    if (channelDeleteNonce > 0) channelDeleteTriggerRef.current?.click();
  }, [channelDeleteNonce]);
  React.useEffect(() => {
    if (entryDeleteNonce > 0) entryDeleteTriggerRef.current?.click();
  }, [entryDeleteNonce]);

  const channels = channelsQuery.data ?? [];

  // Mantém uma seleção válida sempre que a lista muda.
  React.useEffect(() => {
    if (!channels.length) {
      setActiveId(null);
      return;
    }
    if (!activeId || !channels.some((c) => c._id === activeId)) {
      setActiveId(channels[0]._id);
    }
  }, [channels, activeId]);

  const activeChannel = channels.find((c) => c._id === activeId) ?? null;
  const entriesQuery = useEntries(activeId);

  const deleteChannel = useDeleteChannel();
  const deleteEntry = useDeleteEntry(activeId ?? '');

  const canEdit = React.useMemo(() => {
    if (!activeChannel) return false;
    if (refId(activeChannel.owner) === currentUserId) return true;
    return activeChannel.members.some((m) => refId(m) === currentUserId);
  }, [activeChannel, currentUserId]);

  function confirmDeleteChannel(close: () => void): void {
    if (!channelToDelete) return;
    deleteChannel.mutate(channelToDelete._id, {
      onSuccess: () => {
        toast.success('Canal excluído');
        close();
      },
      onError: (error) =>
        handleApiError(error, { context: 'Erro ao excluir canal' }),
    });
  }

  function confirmDeleteEntry(close: () => void): void {
    if (!entryToDelete) return;
    deleteEntry.mutate(entryToDelete._id, {
      onSuccess: () => {
        toast.success('Senha excluída');
        close();
      },
      onError: (error) =>
        handleApiError(error, { context: 'Erro ao excluir senha' }),
    });
  }

  return (
    <PageShell data-test-id="module-senhas">
      <PageShell.Header>
        <PageHeader title="Senhas" />
      </PageShell.Header>

      <PageShell.Content className="p-0">
        {channelsQuery.status === 'pending' && (
          <div className="flex h-full">
            <div className="w-72 border-r p-3">
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="flex-1 p-4">
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        )}

        {channelsQuery.status === 'error' && (
          <LoadError
            message={channelsQuery.error.message}
            refetch={() => channelsQuery.refetch()}
          />
        )}

        {channelsQuery.status === 'success' && (
          <div className="flex h-full min-h-0">
            <ChannelSidebar
              channels={channels}
              activeChannelId={activeId}
              currentUserId={currentUserId}
              onSelect={(c) => setActiveId(c._id)}
              onCreate={() => {
                setChannelTarget(null);
                setChannelNonce((value) => value + 1);
              }}
              onEdit={(c) => {
                setChannelTarget(c);
                setChannelNonce((value) => value + 1);
              }}
              onDelete={(c) => {
                setChannelToDelete(c);
                setChannelDeleteNonce((value) => value + 1);
              }}
            />

            <div className="flex min-w-0 flex-1 flex-col">
              {!activeChannel && (
                <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center text-sm">
                  Selecione ou crie um canal para começar.
                </div>
              )}

              {activeChannel && (
                <React.Fragment>
                  <div className="flex items-center justify-between gap-2 border-b p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {activeChannel.private && (
                          <LockIcon className="text-muted-foreground size-4" />
                        )}
                        <h2 className="truncate font-medium">
                          {activeChannel.name}
                        </h2>
                        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                          <UsersIcon className="size-3" />
                          {activeChannel.members.length}
                        </span>
                      </div>
                      {activeChannel.description && (
                        <p className="text-muted-foreground truncate text-xs">
                          {activeChannel.description}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="flex rounded-md border p-0.5">
                        <Button
                          variant={(view === 'table' && 'secondary') || 'ghost'}
                          size="icon-sm"
                          title="Lista (tabela)"
                          onClick={() => changeView('table')}
                        >
                          <ListIcon className="size-4" />
                        </Button>
                        <Button
                          variant={(view === 'cards' && 'secondary') || 'ghost'}
                          size="icon-sm"
                          title="Cards"
                          onClick={() => changeView('cards')}
                        >
                          <LayoutGridIcon className="size-4" />
                        </Button>
                      </div>

                      {canEdit && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setEntryTarget(null);
                            setEntryNonce((value) => value + 1);
                          }}
                        >
                          <PlusIcon className="size-4" />
                          Nova senha
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto">
                    <EntryList
                      entries={entriesQuery.data ?? []}
                      isLoading={entriesQuery.isPending}
                      canEdit={canEdit}
                      view={view}
                      onEdit={(entry) => {
                        setEntryTarget(entry);
                        setEntryNonce((value) => value + 1);
                      }}
                      onDelete={(entry) => {
                        setEntryToDelete(entry);
                        setEntryDeleteNonce((value) => value + 1);
                      }}
                    />
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
        )}
      </PageShell.Content>

      <ChannelDialog
        key={channelNonce}
        ref={channelTriggerRef}
        channel={channelTarget}
      />

      {activeChannel && (
        <EntryDialog
          key={entryNonce}
          ref={entryTriggerRef}
          channelId={activeChannel._id}
          entry={entryTarget}
        />
      )}

      <ConfirmDialog
        key={channelDeleteNonce}
        ref={channelDeleteTriggerRef}
        title="Excluir canal"
        description={`Excluir "${channelToDelete?.name ?? ''}" e TODAS as suas senhas? Esta ação não pode ser desfeita.`}
        isPending={deleteChannel.isPending}
        confirmLabel="Excluir"
        onConfirm={(close) => confirmDeleteChannel(close)}
      />

      <ConfirmDialog
        key={entryDeleteNonce}
        ref={entryDeleteTriggerRef}
        title="Excluir senha"
        description={`Excluir "${entryToDelete?.title ?? ''}"? Esta ação não pode ser desfeita.`}
        isPending={deleteEntry.isPending}
        confirmLabel="Excluir"
        onConfirm={(close) => confirmDeleteEntry(close)}
      />
    </PageShell>
  );
}
