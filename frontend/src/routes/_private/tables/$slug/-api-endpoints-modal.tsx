import { CopyIcon, InfoIcon } from 'lucide-react';
import type * as React from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Merge } from '@/lib/interfaces';

type ApiEndpoint = {
  method: string;
  path: string;
  description: string;
  params?: string;
};

type ApiEndpointsModalProps = Merge<
  React.ComponentProps<typeof DialogTrigger>,
  { tableSlug: string }
>;

export function ApiEndpointsModal({
  ref,
  tableSlug,
  ...rest
}: ApiEndpointsModalProps): React.JSX.Element {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  const endpoints: Array<ApiEndpoint> = [
    {
      method: 'GET',
      path: `/tables/${tableSlug}`,
      description: 'Obter informações da tabela',
    },
    {
      method: 'GET',
      path: `/tables/${tableSlug}/rows/paginated`,
      description: 'Listar rows com paginação',
      params: '?page=1&perPage=50&search=termo',
    },
    {
      method: 'GET',
      path: `/tables/${tableSlug}/rows/:id`,
      description: 'Obter row específico por ID',
    },
    {
      method: 'POST',
      path: `/tables/${tableSlug}/rows`,
      description: 'Criar novo row',
    },
    {
      method: 'PUT',
      path: `/tables/${tableSlug}/rows/:id`,
      description: 'Atualizar row existente',
    },
    {
      method: 'DELETE',
      path: `/tables/${tableSlug}/rows/:id`,
      description: 'Deletar row permanentemente',
    },
    {
      method: 'PATCH',
      path: `/tables/${tableSlug}/rows/:id/trash`,
      description: 'Enviar row para lixeira',
    },
    {
      method: 'PATCH',
      path: `/tables/${tableSlug}/rows/:id/restore`,
      description: 'Restaurar row da lixeira',
    },
  ];

  const getMethodColor = (method: string): string => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'POST':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'PUT':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'PATCH':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const copyEndpoint = (endpoint: ApiEndpoint): void => {
    const fullUrl = `${baseUrl}${endpoint.path}${endpoint.params || ''}`;
    navigator.clipboard.writeText(fullUrl);

    toast.info('Endpoint copiado', {
      description: 'URL do endpoint foi copiada para a área de transferência',
    });
  };

  return (
    <Dialog>
      <DialogTrigger
        {...rest}
        ref={ref}
      />
      <DialogContent
        className="w-full sm:max-w-[85vw] max-h-[85vh] overflow-y-auto"
        data-test-id="api-endpoints-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <InfoIcon className="size-5" />
            API Endpoints - {tableSlug}
          </DialogTitle>
          <DialogDescription>
            Endpoints disponíveis para integração com a tabela "{tableSlug}".
            Todos os endpoints requerem autenticação via cookie ou JWT.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <strong>Base URL:</strong> {baseUrl}
          </div>

          <div className="space-y-3">
            {endpoints.map((endpoint, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge className={getMethodColor(endpoint.method)}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {endpoint.path}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => copyEndpoint(endpoint)}
                    title="Copiar URL completa"
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  {endpoint.description}
                </p>

                {endpoint.params && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">
                      Parâmetros de exemplo:
                    </span>
                    <code className="block text-xs font-mono bg-muted px-2 py-1 rounded mt-1">
                      {endpoint.params}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Autenticação</h4>
            <p className="text-sm text-muted-foreground">
              Todos os endpoints requerem autenticação. Inclua o cookie
              accessToken nas requisições.
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Documentação Completa</h4>
            <p className="text-sm text-muted-foreground">
              Para documentação interativa completa, acesse:
              <a
                href={`${baseUrl}/documentation`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                {baseUrl}/documentation
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
