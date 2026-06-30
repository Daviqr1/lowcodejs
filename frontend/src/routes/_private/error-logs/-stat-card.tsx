import type { ActivityIcon } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: typeof ActivityIcon;
  accentClass?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accentClass,
}: StatCardProps): React.JSX.Element {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-md',
            accentClass ?? 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
