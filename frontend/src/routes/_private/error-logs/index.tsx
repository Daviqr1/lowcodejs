import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import z from 'zod';

import { DataTableSkeleton } from '@/components/common/data-table';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import type { ISetting } from '@/lib/interfaces';
import { createRouteHead } from '@/lib/seo';

const defaultSearch = { page: 1 };

export const Route = createFileRoute('/_private/error-logs/')({
  beforeLoad: async ({ context, location }) => {
    const hasExplicitPerPage = location.searchStr.includes('perPage');
    if (!hasExplicitPerPage) {
      const settings = context.queryClient.getQueryData<ISetting>(
        queryKeys.settings.all,
      );
      if (settings && settings.PAGINATION_PER_PAGE !== 50) {
        const { redirect } = await import('@tanstack/react-router');
        throw redirect({
          to: '/error-logs',
          search: (prev) => ({
            ...prev,
            perPage: settings.PAGINATION_PER_PAGE,
          }),
          replace: true,
        });
      }
    }
  },
  head: createRouteHead({ title: 'Histórico de erros' }),
  pendingComponent: () => (
    <DataTableSkeleton
      headers={[
        'Data',
        'Status',
        'Usuário',
        'Método',
        'Mensagem',
        'Cause',
        'URL',
      ]}
    >
      <DataTableSkeleton.Cell width="w-40" />
      <DataTableSkeleton.Cell
        width="w-12"
        height="h-6"
        rounded="rounded-full"
      />
      <DataTableSkeleton.Cell width="w-32" />
      <DataTableSkeleton.Cell
        width="w-14"
        height="h-6"
        rounded="rounded-full"
      />
      <DataTableSkeleton.Cell width="w-56" />
      <DataTableSkeleton.Cell width="w-32" />
      <DataTableSkeleton.Cell width="w-40" />
      <DataTableSkeleton.ActionCell />
    </DataTableSkeleton>
  ),
  validateSearch: z.object({
    page: z.coerce.number().default(1),
    perPage: z.coerce.number().optional(),
    search: z.string().optional(),
    statuses: z.string().optional(),
    // 'true' = visão "Resolvidos"; ausente = "Em aberto".
    resolved: z.enum(['true']).optional(),
    'date-range-initial': z.string().optional(),
    'date-range-final': z.string().optional(),
    'order-created-at': z.enum(['asc', 'desc']).optional(),
    'order-status': z.enum(['asc', 'desc']).optional(),
    'order-method': z.enum(['asc', 'desc']).optional(),
    'order-url': z.enum(['asc', 'desc']).optional(),
  }),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
});
