import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import z from 'zod';

import { DataTableSkeleton } from '@/components/common/data-table';
import { queryKeys } from '@/hooks/tanstack-query/_query-keys';
import { userListOptions } from '@/hooks/tanstack-query/_query-options';
import { E_AREA_CAPABILITY, E_ROLE } from '@/lib/constant';
import type { ISetting } from '@/lib/interfaces';
import { hasAreaCapability } from '@/lib/menu/menu-access-permissions';
import { createRouteHead } from '@/lib/seo';
import { useAuthStore } from '@/stores/authentication';

const defaultSearch = { page: 1 };

export const Route = createFileRoute('/_private/users/')({
  beforeLoad: async ({ context, location }) => {
    const capabilities = useAuthStore.getState().user?.capabilities;
    if (!hasAreaCapability(capabilities, E_AREA_CAPABILITY.MANAGE_USERS)) {
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
          to: '/users',
          search: (prev) => ({
            ...prev,
            perPage: settings.PAGINATION_PER_PAGE,
          }),
          replace: true,
        });
      }
    }
  },
  head: createRouteHead({ title: 'Usuários' }),
  pendingComponent: () => (
    <DataTableSkeleton
      headers={['Nome', 'E-mail', 'Papel', 'Status', 'Criado em']}
    >
      <DataTableSkeleton.Cell width="w-45" />
      <DataTableSkeleton.Cell width="w-50" />
      <DataTableSkeleton.Cell width="w-25" />
      <DataTableSkeleton.Cell
        width="w-20"
        height="h-6"
        rounded="rounded-full"
      />
      <DataTableSkeleton.Cell width="w-40" />
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
    'order-email': z.enum(['asc', 'desc']).optional(),
    'order-group': z.enum(['asc', 'desc']).optional(),
    'order-status': z.enum(['asc', 'desc']).optional(),
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
    'order-email': search['order-email'],
    'order-group': search['order-group'],
    'order-status': search['order-status'],
    'order-created-at': search['order-created-at'],
  }),
  loader: ({ context, deps }) => {
    const authenticated = useAuthStore.getState().user?._id;
    context.queryClient.prefetchQuery(
      userListOptions({
        ...deps,
        authenticated,
        role: E_ROLE.ADMINISTRATOR,
      }),
    );
  },
});
