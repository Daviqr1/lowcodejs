import z from 'zod';

import { Merge } from '@application/core/entity.core';

import { RelationshipIdParamsValidator } from '../relationship-base.validator';

export const RelationshipLinkBodyValidator = z.object({
  // Lado a partir do qual a acao parte: o `:slug` da rota e esta tabela.
  side: z.enum(['source', 'target']),
  // Registro fixo deste lado.
  recordId: z.string().trim().min(1),
  // Registro do outro lado a vincular.
  otherId: z.string().trim().min(1),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

export const RelationshipLinkParamsValidator = RelationshipIdParamsValidator;

export type RelationshipLinkRequestPayload = Merge<
  z.infer<typeof RelationshipLinkParamsValidator>,
  z.infer<typeof RelationshipLinkBodyValidator>
>;
