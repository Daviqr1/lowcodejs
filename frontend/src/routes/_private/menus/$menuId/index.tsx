import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';

import { UpdateMenuFormSkeleton } from './-update-form-skeleton';

import { menuDetailOptions } from '@/hooks/tanstack-query/_query-options';

export const Route = createFileRoute('/_private/menus/$menuId/')({
  validateSearch: z.object({
    mode: z.enum(['edit']).optional(),
  }),
  pendingComponent: UpdateMenuFormSkeleton,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(menuDetailOptions(params.menuId));
  },
});
