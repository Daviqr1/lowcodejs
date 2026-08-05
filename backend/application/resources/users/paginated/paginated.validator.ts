import z from 'zod';

import {
  E_ROLE,
  E_USER_STATUS,
  IUser,
  Merge,
  ValueOf,
} from '@application/core/entity.core';
import {
  PaginationQueryValidator,
  TrashedFlagValidator,
} from '@application/core/validator.core';

export const UserPaginatedQueryValidator = PaginationQueryValidator.extend({
  search: z.string({ message: 'A busca deve ser um texto' }).trim().optional(),

  // Filtra usuários por estado de lixeira (default: ativos).
  trashed: TrashedFlagValidator,

  // Filtra usuários retornados por status.
  status: z.enum(E_USER_STATUS, { message: 'Status inválido' }).optional(),

  // Contexto da consulta. Declarar `role=ADMINISTRATOR` pede ao backend
  // aplicar as regras de escopo do admin (hoje: esconder MASTER).
  // O JWT confirma autorização — ver `user-mongoose.repository.ts`.
  role: z.enum(E_ROLE, { message: 'Role inválido' }).optional(),

  'order-name': z.enum(['asc', 'desc']).optional(),
  'order-email': z.enum(['asc', 'desc']).optional(),
  'order-group': z.enum(['asc', 'desc']).optional(),
  'order-status': z.enum(['asc', 'desc']).optional(),
  'order-created-at': z.enum(['asc', 'desc']).optional(),
});

export type UserPaginatedPayload = Merge<
  z.infer<typeof UserPaginatedQueryValidator>,
  {
    user?: Merge<
      Pick<IUser, '_id'>,
      {
        role: ValueOf<typeof E_ROLE>;
      }
    >;
  }
>;
