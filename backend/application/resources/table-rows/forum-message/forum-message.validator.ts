import z from 'zod';

import { Merge } from '@application/core/entity.core';
import { SlugIdParamsValidator } from '@application/core/validator.core';

export const ForumMessageRowParamsValidator = SlugIdParamsValidator;

export const ForumMessageParamsValidator = SlugIdParamsValidator.extend({
  messageId: z.string().trim(),
});

const ForumMessageBodyBaseValidator = z.object({
  text: z.string().optional(),
  attachments: z.array(z.string().trim()).optional(),
  mentions: z.array(z.string().trim()).optional(),
  replyTo: z.string().trim().nullable().optional(),
});

export const ForumMessageCreateBodyValidator = ForumMessageBodyBaseValidator;
export const ForumMessageUpdateBodyValidator = ForumMessageBodyBaseValidator;

export type ForumMessageCreatePayload = Merge<
  Merge<
    z.infer<typeof ForumMessageRowParamsValidator>,
    z.infer<typeof ForumMessageCreateBodyValidator>
  >,
  {
    user: string;
  }
>;

export type ForumMessageUpdatePayload = Merge<
  Merge<
    z.infer<typeof ForumMessageParamsValidator>,
    z.infer<typeof ForumMessageUpdateBodyValidator>
  >,
  {
    user: string;
  }
>;

export type ForumMessageDeletePayload = Merge<
  z.infer<typeof ForumMessageParamsValidator>,
  {
    user: string;
  }
>;

export type ForumMessageMentionReadPayload = Merge<
  z.infer<typeof ForumMessageParamsValidator>,
  {
    user: string;
  }
>;
