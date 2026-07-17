import { ShieldIcon, UserIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { E_USER_STATUS } from '@/lib/constant';
import type { IUser } from '@/lib/interfaces';

type UserViewProps = {
  data: IUser;
};

function getStatusBadge(status: string): React.JSX.Element {
  if (status === E_USER_STATUS.ACTIVE) {
    return <Badge variant="default">Ativo</Badge>;
  }

  return <Badge variant="secondary">Inativo</Badge>;
}

export function UserView({ data }: UserViewProps): React.JSX.Element {
  return (
    <section
      className="space-y-6 p-4"
      data-test-id="user-detail-view"
    >
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nome
            </p>
            <p className="text-sm font-medium">{data.name || '-'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              E-mail
            </p>
            <p className="text-sm font-medium">{data.email || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldIcon className="h-4 w-4 text-primary" />
            </div>
            Acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Status
            </p>
            {getStatusBadge(data.status)}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Grupo
            </p>
            <Badge variant="outline">{data.group.name || '-'}</Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
