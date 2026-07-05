import { CloudAlertIcon, RefreshCcwIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type LoadErrorProps = {
  message?: string;
  refetch: () => void;
};

export function LoadError({
  message = 'Houve um problema ao carregar dados',
  refetch,
}: LoadErrorProps): React.JSX.Element {
  return (
    <Empty
      data-slot="load-error"
      data-test-id="load-error-page"
      className="from-muted/50 to-background h-full bg-linear-to-b from-30%"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CloudAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Houve um problema</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          data-test-id="retry-btn"
          variant="outline"
          size="sm"
          onClick={() => {
            refetch();
          }}
        >
          <RefreshCcwIcon />
          Tentar novamente
        </Button>
      </EmptyContent>
    </Empty>
  );
}
