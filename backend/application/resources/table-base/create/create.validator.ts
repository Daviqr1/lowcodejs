import slugify from 'slugify';
import z from 'zod';

import { Merge } from '@application/core/entity.core';

import { TableStyleSchema } from '../table-base.schema';

export const TableCreateBodyValidator = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Nome é obrigatório')
      .max(40, 'Nome deve ter no máximo 40 caracteres')
      .regex(
        /^[a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s\-_]+$/,
        'Nome pode conter apenas letras, números, espaços, hífen, underscore e ç',
      ),
    slug: z.string().trim().min(1).optional(),
    logo: z.string().trim().nullable().optional(),
    style: TableStyleSchema.optional(),
  })
  .transform((data) => {
    let slug = slugify(data.name, { lower: true, strict: true, trim: true });
    if (data.slug) {
      slug = slugify(data.slug, { lower: true, strict: true, trim: true });
    }
    return { ...data, slug };
  });

export type TableCreatePayload = Merge<
  z.infer<typeof TableCreateBodyValidator>,
  {
    owner: string;
  }
>;
