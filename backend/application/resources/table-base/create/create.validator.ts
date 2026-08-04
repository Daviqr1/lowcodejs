import z from 'zod';

import { Merge } from '@application/core/entity.core';
import SlugService from '@application/services/slug/slug.service';

import { TableStyleSchema } from '../table-base.schema';

// Schema Zod de escopo de modulo: avaliado no import, quando o container de DI
// ainda nao existe. O SlugService e puro (constructor sem argumentos).
const slugService = new SlugService();

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
    let slug = slugService.normalize(data.name);
    if (data.slug) {
      slug = slugService.normalize(data.slug);
    }
    return { ...data, slug };
  });

export type TableCreatePayload = Merge<
  z.infer<typeof TableCreateBodyValidator>,
  {
    owner: string;
  }
>;
