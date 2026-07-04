import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';

import { CreateFieldSkeleton } from './-create-field-skeleton';

import { tableDetailOptions } from '@/hooks/tanstack-query/_query-options';
import { E_FIELD_TYPE } from '@/lib/constant';

export const Route = createFileRoute('/_private/tables/$slug/field/create/')({
  pendingComponent: CreateFieldSkeleton,
  validateSearch: z.object({
    'field-type': z
      // z.enum exige tupla não-vazia; Object.keys devolve string[] (zod-idiom).
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      .enum(Object.keys(E_FIELD_TYPE) as [string, ...Array<string>])
      .optional(),
    group: z.string().optional(),
  }),
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(tableDetailOptions(params.slug));
  },
});
