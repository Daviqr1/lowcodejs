import type { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StatCardProps = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: StatCardProps): React.JSX.Element {
  let displayValue: number | string = value;
  if (typeof value === 'number') displayValue = value.toLocaleString('pt-BR');

  return (
    <Card
      data-test-id={`stat-card-${title}`}
      className="transition-shadow duration-200 hover:shadow-md"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold">{displayValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
