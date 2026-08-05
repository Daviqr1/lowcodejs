import { QueryClient as Base } from '@tanstack/react-query';

function createQueryClient(): Base {
  return new Base({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: true,
        staleTime: 60 * 60 * 1000, // 1 hour
      },
    },
  });
}

let browserQueryClient: Base | undefined;

/**
 * No servidor devolve uma instancia NOVA por requisicao; no navegador devolve
 * sempre a mesma.
 *
 * O processo Nitro atende todos os usuarios. Um QueryClient de modulo ficava
 * compartilhado entre requisicoes e, com `staleTime` de 1h, podia servir dados
 * cacheados de um usuario para outro — inclusive alimentando os gates de
 * capacidade lidos no `beforeLoad` durante o SSR.
 */
export function getQueryClient(): Base {
  if (typeof window === 'undefined') return createQueryClient();

  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}
