import z from 'zod';

/**
 * Blocos Zod repetidos pelos validators dos recursos. Sao valores de escopo de
 * modulo — avaliados no import, antes de o container de DI existir —, o mesmo
 * escape documentado dos proprios validators.
 */

export const PageValidator = z.coerce
  .number({ message: 'A página deve ser um número' })
  .min(1, 'A página deve ser maior que zero')
  .default(1);

/** Sem `.default()` — cada listagem escolhe o seu (`PerPageValidator.default(20)`). */
export const PerPageValidator = z.coerce
  .number({ message: 'O limite por página deve ser um número' })
  .min(1, 'O limite por página deve ser maior que zero')
  .max(100, 'O limite por página deve ser no máximo 100');

/** `page` + `perPage` das listagens. Estenda para o resto da query. */
export const PaginationQueryValidator = z.object({
  page: PageValidator,
  perPage: PerPageValidator.default(50),
});

/** `:slug` + `:_id` das rotas de row e de campo. Estenda para params extras. */
export const SlugIdParamsValidator = z.object({
  slug: z.string().trim().min(1),
  _id: z.string().trim().min(1),
});

/** `ids` das operacoes em massa. O cap por chamador entra com `.max(n)`. */
export const BulkIdsValidator = z
  .array(z.string().trim().min(1))
  .min(1, 'Selecione pelo menos um item');

/** `?trashed=true|false` — aceita tambem o booleano ja coagido. */
export const TrashedFlagValidator = z
  .preprocess(
    (value) => {
      if (typeof value === 'boolean') return String(value);
      return value;
    },
    z.enum(['true', 'false']).transform((value) => value === 'true'),
  )
  .optional();
