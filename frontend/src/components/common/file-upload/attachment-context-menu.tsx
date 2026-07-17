import { DownloadIcon, ExternalLinkIcon, LinkIcon } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { IStorage } from '@/lib/interfaces';
import { getStorageDownloadUrl, getStorageInlineUrl } from '@/lib/storage-url';

type AttachmentContextMenuProps = {
  storage: Pick<IStorage, 'url' | 'originalName'>;
  children: React.ReactNode;
};

export function AttachmentContextMenu({
  storage,
  children,
}: AttachmentContextMenuProps): React.JSX.Element {
  const inlineUrl = getStorageInlineUrl(storage);
  const downloadUrl = getStorageDownloadUrl(storage);

  const handleCopyLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(inlineUrl);
    toast.success('Link copiado');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem asChild>
          <a
            href={inlineUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLinkIcon />
            Abrir em nova aba
          </a>
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <a href={downloadUrl}>
            <DownloadIcon />
            Salvar arquivo
          </a>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => void handleCopyLink()}>
          <LinkIcon />
          Copiar link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
