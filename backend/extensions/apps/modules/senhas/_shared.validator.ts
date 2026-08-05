import { z } from 'zod';

import { objectId } from '@application/features/_shared.validator';

/** Validadores Zod do módulo Senhas. Mensagens em PT-BR. */

/** `:channelId` — repetido em 6 rotas, antes so como JSON Schema a mao. */
export const ChannelParamsValidator = z.object({
  channelId: objectId(),
});

/** Mais `:entryId` — aponta uma senha dentro do canal. */
export const EntryParamsValidator = ChannelParamsValidator.extend({
  entryId: objectId(),
});

export const CreateChannelValidator = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(120),
  description: z.string().trim().max(2000).nullish(),
  // Privado por padrão.
  private: z.boolean().default(true),
  members: z.array(objectId()).default([]),
});

export const UpdateChannelValidator = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(120).optional(),
  description: z.string().trim().max(2000).nullish(),
  private: z.boolean().optional(),
  members: z.array(objectId()).optional(),
});

export const CreateEntryValidator = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório').max(200),
  username: z.string().trim().max(320).nullish(),
  url: z.string().trim().max(2000).nullish(),
  secret: z.string().min(1, 'Senha é obrigatória').max(10000),
  notes: z.string().max(10000).nullish(),
});

export const UpdateEntryValidator = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório').max(200).optional(),
  username: z.string().trim().max(320).nullish(),
  url: z.string().trim().max(2000).nullish(),
  secret: z.string().min(1, 'Senha é obrigatória').max(10000).optional(),
  notes: z.string().max(10000).nullish(),
});

export type CreateChannelPayload = z.infer<typeof CreateChannelValidator>;
export type UpdateChannelPayload = z.infer<typeof UpdateChannelValidator>;
export type CreateEntryPayload = z.infer<typeof CreateEntryValidator>;
export type UpdateEntryPayload = z.infer<typeof UpdateEntryValidator>;
