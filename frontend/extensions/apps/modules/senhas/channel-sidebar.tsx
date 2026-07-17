import {
  GlobeIcon,
  LockIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import React from 'react';

import type { IPasswordChannel } from './senhas-types';
import { refId } from './senhas-types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type ChannelSidebarProps = {
  channels: Array<IPasswordChannel>;
  activeChannelId: string | null;
  currentUserId: string;
  onSelect: (channel: IPasswordChannel) => void;
  onCreate: () => void;
  onEdit: (channel: IPasswordChannel) => void;
  onDelete: (channel: IPasswordChannel) => void;
};

export function ChannelSidebar({
  channels,
  activeChannelId,
  currentUserId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: ChannelSidebarProps): React.JSX.Element {
  return (
    <div className="flex w-72 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <span className="text-sm font-medium">Canais</span>
        <Button
          size="sm"
          variant="outline"
          onClick={onCreate}
        >
          <PlusIcon className="size-4" />
          Novo
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {channels.length === 0 && (
            <p className="text-muted-foreground p-4 text-center text-sm">
              Nenhum canal ainda. Crie o primeiro cofre de senhas.
            </p>
          )}

          {channels.map((channel) => {
            const isOwner = refId(channel.owner) === currentUserId;
            const isActive = channel._id === activeChannelId;
            return (
              <div
                key={channel._id}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-2 text-sm',
                  'hover:bg-muted cursor-pointer',
                  isActive && 'bg-muted',
                )}
                onClick={() => onSelect(channel)}
              >
                {channel.private && (
                  <LockIcon className="text-muted-foreground size-4 shrink-0" />
                )}
                {!channel.private && (
                  <GlobeIcon className="text-muted-foreground size-4 shrink-0" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{channel.name}</p>
                  {channel.description && (
                    <p className="text-muted-foreground truncate text-xs">
                      {channel.description}
                    </p>
                  )}
                </div>

                <Badge
                  variant="secondary"
                  className="shrink-0"
                >
                  {channel.entriesCount}
                </Badge>

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVerticalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem onClick={() => onEdit(channel)}>
                        <PencilIcon className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(channel)}
                      >
                        <Trash2Icon className="size-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
