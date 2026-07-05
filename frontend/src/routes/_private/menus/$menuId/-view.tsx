import {
  ExternalLinkIcon,
  HouseIcon,
  MenuIcon,
  SettingsIcon,
} from 'lucide-react';

import { ContentViewer } from '@/components/common/rich-editor';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { E_MENU_ITEM_TYPE, MENU_ITEM_TYPE_OPTIONS } from '@/lib/constant';
import type { IMenu } from '@/lib/interfaces';

type MenuViewProps = {
  data: IMenu;
};

export function MenuView({ data }: MenuViewProps): React.JSX.Element {
  const typeLabel =
    MENU_ITEM_TYPE_OPTIONS.find((opt) => opt.value === data.type)?.label ||
    data.type;

  return (
    <section
      className="space-y-6 p-4"
      data-test-id="menu-detail-view"
    >
      {/* Informações do Menu */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <MenuIcon className="h-4 w-4 text-primary" />
            </div>
            Informações do Menu
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
              Tipo
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{typeLabel}</Badge>
              {data.isInitial && (
                <Badge className="gap-1 border-transparent bg-primary/10 text-primary hover:bg-primary/10">
                  <HouseIcon className="size-3" />
                  Página inicial
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Posição
            </p>
            <p className="text-sm font-medium">{data.order ?? 0}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ícone
            </p>
            {data.icon && (
              <div className="flex items-center gap-2 p-2 border rounded-md w-fit">
                <img
                  src={data.icon}
                  alt="Ícone do menu"
                  className="h-8 w-8 object-contain"
                />
                <span className="text-xs text-muted-foreground">
                  Ícone customizado
                </span>
              </div>
            )}
            {!data.icon && (
              <p className="text-sm text-muted-foreground">
                Padrão (ícone do tipo)
              </p>
            )}
          </div>

          {data.type !== E_MENU_ITEM_TYPE.SEPARATOR && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Menu Pai
              </p>
              <p className="text-sm font-medium">
                {data.parent?.name || 'Nenhum (raiz)'}
              </p>
            </div>
          )}

          {data.type === E_MENU_ITEM_TYPE.SEPARATOR && (
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Este item é um separador visual. Separadores são usados para
                organizar o menu em seções.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração */}
      {data.type !== E_MENU_ITEM_TYPE.SEPARATOR && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <SettingsIcon className="h-4 w-4 text-primary" />
              </div>
              Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.type === E_MENU_ITEM_TYPE.TABLE ||
              data.type === E_MENU_ITEM_TYPE.FORM) && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tabela
                </p>
                <p className="text-sm font-medium">{data.table?.name || '-'}</p>
              </div>
            )}

            {data.type === E_MENU_ITEM_TYPE.PAGE && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Conteúdo da Página
                </p>
                {data.html && <ContentViewer content={data.html} />}
                {!data.html && (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            )}

            {data.type === E_MENU_ITEM_TYPE.EXTERNAL && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  URL
                </p>
                {data.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    {data.url}
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                )}
                {!data.url && (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
