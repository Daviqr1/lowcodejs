import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import z from 'zod';

import { DataTableSkeleton } from '@/components/common/data-table';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { groupListOptions } from '@/hooks/tanstack-query/_query-options';
import { E_AREA_CAPABILITY } from '@/lib/constant';
import type { ISetting } from '@/lib/interfaces';
import { hasAreaCapability } from '@/lib/menu/menu-access-permissions';
import { createRouteHead } from '@/lib/seo';

const defaultSearch = { page: 1 };

export const Route = createFileRoute('/_private/groups/')({
  beforeLoad: async ({ context, location }) => {
    const { useAuthStore } = await import('@/stores/authentication');
    const capabilities = useAuthStore.getState().user?.capabilities;
    if (
      !hasAreaCapability(capabilities, E_AREA_CAPABILITY.MANAGE_USER_GROUPS)
    ) {
      const { redirect } = await import('@tanstack/react-router');
      throw redirect({ to: '/tables' });
    }

    const hasExplicitPerPage = location.searchStr.includes('perPage');
    if (!hasExplicitPerPage) {
      const settings = context.queryClient.getQueryData<ISetting>(
        queryKeys.settings.all,
      );
      if (settings && settings.PAGINATION_PER_PAGE !== 50) {
        const { redirect } = await import('@tanstack/react-router');
        throw redirect({
          to: '/groups',
          search: (prev) => ({
            ...prev,
            perPage: settings.PAGINATION_PER_PAGE,
          }),
          replace: true,
        });
      }
    }
  },
  head: createRouteHead({ title: 'Grupos' }),
  pendingComponent: () => (
    <DataTableSkeleton headers={['Nome', 'Slug', 'Descrição']}>
      <DataTableSkeleton.Cell width="w-37.5" />
      <DataTableSkeleton.Cell width="w-62.5" />
      <DataTableSkeleton.ActionCell />
    </DataTableSkeleton>
  ),
  validateSearch: z.object({
    search: z.string().optional(),
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
    'order-name': z.enum(['asc', 'desc']).optional(),
    'order-description': z.enum(['asc', 'desc']).optional(),
    'order-created-at': z.enum(['asc', 'desc']).optional(),
  }),
  search: {
    middlewares: [stripSearchParams(defaultSearch)],
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    perPage: search.perPage,
    search: search.search,
    trashed: search.trashed,
    'order-name': search['order-name'],
    'order-description': search['order-description'],
    'order-created-at': search['order-created-at'],
  }),
  loader: ({ context, deps }) => {
    context.queryClient.prefetchQuery(groupListOptions(deps));
  },
});
