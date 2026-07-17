import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import z from 'zod';

import { DataTableSkeleton } from '@/components/common/data-table';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { tableListOptions } from '@/hooks/tanstack-query/_query-options';
import type { ISetting } from '@/lib/interfaces';

const defaultSearch = { page: 1 };

export const Route = createFileRoute('/_private/tables/')({
  beforeLoad: async ({ context, location }) => {
    const hasExplicitPerPage = location.searchStr.includes('perPage');
    const hasExplicitSort =
      location.searchStr.includes('order-name') ||
      location.searchStr.includes('order-link') ||
      location.searchStr.includes('order-created-at') ||
      location.searchStr.includes('order-owner');

    let customPerPage: number | undefined;
    if (!hasExplicitPerPage) {
      const settings = context.queryClient.getQueryData<ISetting>(
        queryKeys.settings.all,
      );
      if (settings && settings.PAGINATION_PER_PAGE !== 50) {
        customPerPage = settings.PAGINATION_PER_PAGE;
      }
    }

    if (customPerPage !== undefined || !hasExplicitSort) {
      const { redirect } = await import('@tanstack/react-router');
      throw redirect({
        to: '/tables',
        search: (prev) => ({
          ...prev,
          ...(customPerPage !== undefined && { perPage: customPerPage }),
          ...(!hasExplicitSort && { 'order-created-at': 'desc' }),
        }),
        replace: true,
      });
    }
  },
  pendingComponent: () => (
    <DataTableSkeleton
      headers={[
        'Tabela',
        'Link (slug)',
        'Visibilidade',
        'Criado por',
        'Criado em',
      ]}
    >
      <DataTableSkeleton.Cell width="w-40" />
      <DataTableSkeleton.Cell width="w-32" />
      <DataTableSkeleton.Cell width="w-36" />
      <DataTableSkeleton.Cell width="w-36" />
      <DataTableSkeleton.ActionCell />
    </DataTableSkeleton>
  ),
  validateSearch: z.object({
    search: z.string().optional(),
    page: z.coerce.number().default(1),
    perPage: z.coerce.number().optional(),
    name: z.string().optional(),
    trashed: z
      .preprocess(
        (v) => {
          if (typeof v === 'boolean') return String(v);
          return v;
        },
        z.enum(['true', 'false']).transform((v) => v === 'true'),
      )
      .optional(),
    owner: z.string().optional(),
    'order-name': z.enum(['asc', 'desc']).optional(),
    'order-link': z.enum(['asc', 'desc']).optional(),
    'order-created-at': z.enum(['asc', 'desc']).optional(),
    'order-owner': z.enum(['asc', 'desc']).optional(),
  }),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    search: search.search,
    name: search.name,
    trashed: search.trashed,
    owner: search.owner,
    'order-name': search['order-name'],
    'order-link': search['order-link'],
    'order-created-at': search['order-created-at'],
    'order-owner': search['order-owner'],
  }),
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(tableListOptions(deps));
  },
});
