import z from 'zod';

/**
 * Blocos Zod reusados por mais de uma fatia. Este e o nivel GLOBAL do padrao
 * `_shared`: regra usada por duas ou mais features mora aqui; regra de uma
 * fatia so fica no `_shared.validator.ts` da propria pasta.
 *
 * Cada bloco e uma FUNCAO que devolve um schema novo a cada chamada, nunca uma
 * constante ja instanciada — assim dois validators nunca compartilham o mesmo
 * no e nenhum `.optional()`/`.extend()` de um contexto alcanca o outro.
 *
 * Sao valores de escopo de modulo, avaliados no import antes de o container de
 * DI existir: o escape documentado em `application/core/CLAUDE.md`.
 */

export function page(): z.ZodDefault<z.ZodCoercedNumber<unknown>> {
  return z.coerce
    .number({ message: 'A página deve ser um número' })
    .min(1, 'A página deve ser maior que zero')
    .default(1);
}

/** Sem `.default()` — cada listagem escolhe o seu (`perPage().default(20)`). */
export function perPage(): z.ZodCoercedNumber<unknown> {
  return z.coerce
    .number({ message: 'O limite por página deve ser um número' })
    .min(1, 'O limite por página deve ser maior que zero')
    .max(100, 'O limite por página deve ser no máximo 100');
}

/** `page` + `perPage` das listagens. Estenda para o resto da query. */
export function pagination(): z.ZodObject<
  {
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    perPage: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
  },
  z.core.$strip
> {
  return z.object({
    page: page(),
    perPage: perPage().default(50),
  });
}

/** `:slug` + `:_id` das rotas de row e de campo. Estenda para params extras. */
export function slugIdParams(): z.ZodObject<
  { slug: z.ZodString; _id: z.ZodString },
  z.core.$strip
> {
  return z.object({
    slug: z.string().trim().min(1),
    _id: z.string().trim().min(1),
  });
}

/** `ids` das operacoes em massa. O cap por chamador entra com `.max(n)`. */
export function bulkIds(): z.ZodArray<z.ZodString> {
  return z
    .array(z.string().trim().min(1))
    .min(1, 'Selecione pelo menos um item');
}

/**
 * Query booleana `?flag=true|false` — aceita tambem o booleano ja coagido.
 *
 * Generaliza o antigo `TrashedFlagValidator`: o mesmo par
 * `preprocess` + `enum` + `transform` estava reescrito, com comportamentos
 * divergentes, para `trashed`, `unreadOnly`, `excludeLinked` e `resolved`.
 */
export function boolFlag(): z.ZodOptional<
  z.ZodPreprocess<
    z.ZodPipe<
      z.ZodEnum<{ true: 'true'; false: 'false' }>,
      z.ZodTransform<boolean, 'true' | 'false'>
    >
  >
> {
  return z
    .preprocess(
      (value) => {
        if (typeof value === 'boolean') return String(value);
        return value;
      },
      z.enum(['true', 'false']).transform((value) => value === 'true'),
    )
    .optional();
}
