import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type ComboboxLoadMoreProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

export function ComboboxLoadMore({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: ComboboxLoadMoreProps): React.ReactNode {
  if (!hasNextPage) return null;

  return (
    <div className="border-t p-1">
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={onLoadMore}
        disabled={isFetchingNextPage}
      >
        {isFetchingNextPage && (
          <React.Fragment>
            <Spinner className="size-4" />
            Carregando...
          </React.Fragment>
        )}
        {!isFetchingNextPage && 'Carregar mais'}
      </Button>
    </div>
  );
}
