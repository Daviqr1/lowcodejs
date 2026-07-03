import { ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useRowUpdateReaction } from '@/hooks/tanstack-query/use-row-update-reaction';
import { E_REACTION_TYPE } from '@/lib/constant';
import { handleApiError } from '@/lib/handle-api-error';
import type { IField, IReactionSummary, IRow } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

interface TableRowReactionCellProps {
  row: IRow;
  field: IField;
  tableSlug: string;
}

export function TableRowReactionCell({
  field,
  row,
  tableSlug,
}: TableRowReactionCellProps): React.JSX.Element {
  const summary: IReactionSummary = row[field.slug] ?? {};
  const likeCount = summary._likeCount ?? 0;
  const unlikeCount = summary._unlikeCount ?? 0;
  const userLike = summary._userReaction === E_REACTION_TYPE.LIKE;
  const userUnlike = summary._userReaction === E_REACTION_TYPE.UNLIKE;

  const reaction = useRowUpdateReaction({
    onError(error) {
      handleApiError(error, { context: 'Erro ao reagir' });
    },
  });

  return (
    <div
      data-slot="table-row-reaction-cell"
      data-test-id="reaction-cell"
      className="inline-flex gap-1"
    >
      <Button
        size="sm"
        variant="ghost"
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          reaction.mutate({
            tableSlug,
            rowId: row._id,
            field: field.slug,
            type: E_REACTION_TYPE.LIKE,
          });
        }}
      >
        <ThumbsUpIcon
          className={cn('size-4', userLike && 'fill-primary text-primary')}
        />
        <span className="font-medium">{likeCount}</span>
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          reaction.mutate({
            tableSlug,
            rowId: row._id,
            field: field.slug,
            type: E_REACTION_TYPE.UNLIKE,
          });
        }}
      >
        <ThumbsDownIcon
          className={cn(
            'size-4',
            userUnlike && 'fill-destructive text-destructive',
          )}
        />
        <span className="font-medium">{unlikeCount}</span>
      </Button>
    </div>
  );
}
