import { DownloadIcon, FileIcon } from 'lucide-react';

import { AttachmentContextMenu } from '@/components/common/file-upload/attachment-context-menu';
import type { IField, IRow, IStorage } from '@/lib/interfaces';
import { getStorageDownloadUrl } from '@/lib/storage-url';
import { cn } from '@/lib/utils';

interface TableRowFileCellProps {
  row: IRow;
  field: IField;
  isGallery?: boolean;
  isCardOrMosaic?: boolean;
}

export function TableRowFileCell({
  field,
  row,
  isGallery = false,
  isCardOrMosaic = false,
}: TableRowFileCellProps): React.JSX.Element {
  const raw = row[field.slug];
  let values: Array<IStorage> = [];
  if (Array.isArray(raw)) {
    values = raw.filter(
      (value): value is IStorage =>
        typeof value === 'object' && value !== null && 'filename' in value,
    );
  }

  if (values.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <ul
      data-slot="table-row-file-cell"
      data-test-id="file-cell"
      className={cn('space-y-1', isGallery && 'grid grid-cols-4 gap-1')}
    >
      {values.map((value) => {
        const isImage = value.mimetype.includes('image');

        if ((isGallery || isCardOrMosaic) && isImage) {
          return (
            <li key={value._id}>
              <AttachmentContextMenu storage={value}>
                <a
                  href={value.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex flex-col items-center gap-1 text-center underline underline-offset-2',
                    isCardOrMosaic &&
                      'h-full w-full overflow-hidden no-underline justify-center',
                  )}
                  onClick={(e) => e.stopPropagation()}
                  title={`Abrir ${value.originalName} em nova aba`}
                >
                  <img
                    src={value.url}
                    alt={value.originalName}
                    className={cn(
                      'object-cover',
                      isCardOrMosaic && 'size-full h-full block',
                      !isCardOrMosaic && 'size-16',
                    )}
                  />
                  {!isCardOrMosaic && (
                    <span className="text-xs text-center">
                      {value.originalName}
                    </span>
                  )}
                </a>
              </AttachmentContextMenu>
            </li>
          );
        }

        if ((isGallery || isCardOrMosaic) && !isImage) {
          return (
            <li key={value._id}>
              <AttachmentContextMenu storage={value}>
                <a
                  href={value.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 text-center underline underline-offset-2"
                  onClick={(e) => e.stopPropagation()}
                  title={`Abrir ${value.originalName} em nova aba`}
                >
                  <FileIcon
                    className="size-16 text-muted-foreground"
                    strokeWidth={1}
                  />
                  <span className="text-xs text-center">
                    {value.originalName}
                  </span>
                </a>
              </AttachmentContextMenu>
            </li>
          );
        }

        return (
          <li
            key={value._id}
            className="flex items-center gap-2"
          >
            <AttachmentContextMenu storage={value}>
              <a
                href={value.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
                title={`Abrir ${value.originalName} em nova aba (botão direito para salvar)`}
              >
                {value.originalName}
              </a>
            </AttachmentContextMenu>
            <a
              href={getStorageDownloadUrl(value)}
              aria-label={`Baixar ${value.originalName}`}
              title="Baixar"
              className="text-muted-foreground hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <DownloadIcon className="size-4" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
