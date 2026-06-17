import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';

import { UpdateGroupFormSkeleton } from './-update-form-skeleton';

import { groupDetailOptions } from '@/hooks/tanstack-query/_query-options';

export const Route = createFileRoute('/_private/groups/$groupId/')({
  validateSearch: z.object({
    mode: z.enum(['edit']).optional(),
  }),
  pendingComponent: UpdateGroupFormSkeleton,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(groupDetailOptions(params.groupId));
  },
});
