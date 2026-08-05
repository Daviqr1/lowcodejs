import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  // Recebido do `getRouter`: no SSR e uma instancia por requisicao, entao o
  // Provider nao pode importar um singleton de modulo por conta propria — tem
  // de ser exatamente o mesmo client injetado no contexto das rotas.
  queryClient: QueryClient;
}): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
