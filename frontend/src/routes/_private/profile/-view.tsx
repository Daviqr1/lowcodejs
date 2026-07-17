import { UserIcon, UsersIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { IUser } from '@/lib/interfaces';

type ProfileViewProps = {
  data: IUser;
};

export function ProfileView({ data }: ProfileViewProps): React.JSX.Element {
  return (
    <section
      className="space-y-6 p-4"
      data-test-id="profile-view"
    >
      {/* Dados Pessoais */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            Dados Pessoais
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

      {/* Grupo */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <UsersIcon className="h-4 w-4 text-primary" />
            </div>
            Grupo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nome do Grupo
            </p>
            <Badge variant="secondary">{data.group.name}</Badge>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Descrição
            </p>
            <p className="text-sm font-medium">
              {data.group.description || 'Sem descrição disponível'}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
