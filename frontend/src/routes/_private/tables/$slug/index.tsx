import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import z from 'zod';

import { TableSkeleton } from '@/components/common/table-views';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import {
  rowListOptions,
  tableDetailOptions,
} from '@/hooks/tanstack-query/_query-options';
import type { ISetting } from '@/lib/interfaces';
import { createRouteHead } from '@/lib/seo';
import { useAuthStore } from '@/stores/authentication';

const defaultSearch = { page: 1 };

export const Route = createFileRoute('/_private/tables/$slug/')({
  head: createRouteHead({ title: 'Tabela' }),
  pendingComponent: () => <TableSkeleton />,
  validateSearch: z
    .object({
      page: z.coerce.number().default(1),
      perPage: z.coerce.number().optional(),
      trashed: z
        .preprocess(
          (v) => {
            if (typeof v === 'boolean') return String(v);
            return v;
          },
          z.enum(['true', 'false']).transform((v) => v === 'true'),
        )
        .optional(),
    })
    .catchall(
      z.union([z.enum(['asc', 'desc']).optional(), z.string().optional()]),
    ),
  search: {
    middlewares: [
      // @ts-expect-error O `.catchall` (params dinâmicos order-<slug>) cria um
      // índice string que faz o stripSearchParams exigir `page: string`; aqui é
      // number. Limitação da combinação Zod catchall + stripSearchParams.
      stripSearchParams(defaultSearch),
    ],
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, params, deps }) => {
    const isAuthenticated = Boolean(useAuthStore.getState().user);
    if (!isAuthenticated) return;

    // Paginação padrão vem da configuração global (Setting.PAGINATION_PER_PAGE),
    // não da URL nem de configuração por tabela.
    const settings = context.queryClient.getQueryData<ISetting>(
      queryKeys.settings.all,
    );

    context.queryClient.prefetchQuery(tableDetailOptions(params.slug));
    context.queryClient.prefetchQuery(
      rowListOptions(params.slug, deps, settings?.PAGINATION_PER_PAGE),
    );
  },
});
