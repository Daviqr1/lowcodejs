import z from 'zod';

import { E_ROLE, IUser, Merge, ValueOf } from '@application/core/entity.core';
import {
  PaginationQueryValidator,
  TrashedFlagValidator,
} from '@application/core/validator.core';

export const UserGroupPaginatedQueryValidator = PaginationQueryValidator.extend(
  {
    search: z
      .string({ message: 'A busca deve ser um texto' })
      .trim()
      .optional(),

    // Filtra grupos por estado de lixeira (default: ativos).
    trashed: TrashedFlagValidator,

    'order-name': z.enum(['asc', 'desc']).optional(),
    'order-description': z.enum(['asc', 'desc']).optional(),
    'order-created-at': z.enum(['asc', 'desc']).optional(),
  },
);

export type UserGroupPaginatedPayload = Merge<
  z.infer<typeof UserGroupPaginatedQueryValidator>,
  {
    user?: Merge<
      Pick<IUser, '_id'>,
      {
        role: ValueOf<typeof E_ROLE>;
      }
    >;
  }
>;
