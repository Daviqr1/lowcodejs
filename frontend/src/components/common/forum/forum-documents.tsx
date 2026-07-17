import { DownloadIcon, FileIcon } from 'lucide-react';
import React from 'react';

import type { ForumDocument } from './forum-types';

import { AttachmentContextMenu } from '@/components/common/file-upload/attachment-context-menu';
import { getStorageDownloadUrl } from '@/lib/storage-url';

type ForumDocumentsProps = {
  documents: Array<ForumDocument>;
};

export function ForumDocuments({
  documents,
}: ForumDocumentsProps): React.JSX.Element {
  return (
    <div
      data-slot="forum-documents"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {documents.map((doc) => {
        const isImage = doc.file.mimetype.includes('image');
        let thumbnail = (
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted/60">
            <FileIcon className="size-6 text-muted-foreground" />
          </div>
        );
        if (isImage) {
          thumbnail = (
            <img
              src={doc.file.url}
              alt={doc.file.originalName}
              className="h-16 w-16 rounded-md object-cover"
            />
          );
        }

        let authorLabel = 'Usuario';
        if (typeof doc.author === 'string') {
          authorLabel = doc.author;
        } else if (doc.author?.name) {
          authorLabel = doc.author.name;
        }

        return (
          <div
            key={`${doc.messageId}-${doc.file._id}`}
            className="flex gap-3 rounded-lg border p-3 hover:bg-muted/40"
          >
            <AttachmentContextMenu storage={doc.file}>
              <a
                href={doc.file.url}
                target="_blank"
                rel="noreferrer"
                className="flex gap-3 flex-1 min-w-0"
              >
                {thumbnail}
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">
                    {doc.file.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">{authorLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.dateLabel}
                  </p>
                </div>
              </a>
            </AttachmentContextMenu>
            <a
              href={getStorageDownloadUrl(doc.file)}
              aria-label={`Baixar ${doc.file.originalName}`}
              title="Baixar"
              className="self-start text-muted-foreground hover:text-primary p-1"
            >
              <DownloadIcon className="size-4" />
            </a>
          </div>
        );
      })}
    </div>
  );
}
