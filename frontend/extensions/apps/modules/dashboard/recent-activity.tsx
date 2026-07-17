import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const iconMap = {
  table_created: Table,
  user_created: Users,
} as const;

type ActivityItem = {
  id: string;
  type: 'table_created' | 'user_created';
  description: string;
  time: string;
};

type RecentActivityProps = {
  data: Array<ActivityItem>;
};

export function RecentActivity({
  data,
}: RecentActivityProps): React.JSX.Element {
  return (
    <Card data-test-id="recent-activity">
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade recente.
          </p>
        )}
        {data.map((activity) => {
          const Icon = iconMap[activity.type] ?? Table;
          const relative = formatDistanceToNow(new Date(activity.time), {
            addSuffix: true,
            locale: ptBR,
          });
          return (
            <div
              key={activity.id}
              className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 -mx-2 px-2 rounded-md transition-colors hover:bg-muted/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">
                  {activity.description}
                </p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">
                {relative}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
