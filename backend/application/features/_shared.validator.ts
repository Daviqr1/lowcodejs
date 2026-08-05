import z from 'zod';

import {
  E_PERMISSION_TARGET,
  E_ROLE,
  E_SORT_DIRECTION,
  type IUser,
  type Merge,
  type ValueOf,
} from '@application/core/entity.core';
import {
  OBJECT_ID_REGEX,
  PASSWORD_REGEX,
} from '@application/core/field-rules.core';

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

/** `:_id` das rotas por recurso. Estava reescrito em 8 fatias. */
export function identifier(): z.ZodObject<{ _id: z.ZodString }, z.core.$strip> {
  return z.object({
    _id: z
      .string({ message: 'O ID é obrigatório' })
      .trim()
      .min(1, 'O ID é obrigatório'),
  });
}

/** `?search=` das listagens. Estava reescrito em 11 pontos. */
export function search(): z.ZodOptional<z.ZodString> {
  return z.string({ message: 'A busca deve ser um texto' }).trim().optional();
}

/** `?order-<campo>=asc|desc`. Estava como literal solto em 26 pontos. */
export function sortDirection(): z.ZodOptional<
  z.ZodEnum<typeof E_SORT_DIRECTION>
> {
  return z.enum(E_SORT_DIRECTION).optional();
}

/** Email de entrada. Estava reescrito em 4 fatias. */
export function email(): z.ZodString {
  return z
    .string({ message: 'O email é obrigatório' })
    .email('Digite um email válido')
    .trim();
}

/**
 * Senha nova: exige a forca do `PASSWORD_REGEX`.
 *
 * Estava reescrita em 4 fatias com 3 textos diferentes para a mesma regra —
 * o usuario via uma mensagem no cadastro e outra no perfil. Fica o texto mais
 * completo das copias.
 *
 * Nao serve para conferir senha existente (login): ali a forca e verificada
 * contra o hash, e o schema so precisa exigir presenca.
 *
 * O `label` existe porque `profile` valida o campo `newPassword` ao lado de um
 * `currentPassword` — ali a mensagem precisa dizer "A nova senha" para o
 * usuario saber de qual das duas o erro fala. E so o sujeito da frase; a regra
 * conferida e a mesma em todos os chamadores.
 */
export function strongPassword(label = 'A senha'): z.ZodString {
  return z
    .string({ message: `${label} é obrigatória` })
    .trim()
    .min(6, `${label} deve ter no mínimo 6 caracteres`)
    .regex(
      PASSWORD_REGEX,
      `${label} deve conter ao menos: 1 maiúscula, 1 minúscula, 1 número e 1 especial`,
    );
}

/**
 * Id de documento Mongo, conferido contra o `OBJECT_ID_REGEX`.
 *
 * Mais estrito que `identifier()`, que so exige texto nao vazio. Use onde o
 * valor e de fato um `_id`, nunca onde a rota aceita slug.
 */
export function objectId(): z.ZodString {
  return z
    .string({ message: 'O ID é obrigatório' })
    .trim()
    .regex(OBJECT_ID_REGEX, 'ID inválido');
}

/**
 * Alvo de uma acao protegida (`{ kind, group }`). Estava reescrito em
 * `table-base` (permissoes da tabela), `table-fields` (visibilidade do campo)
 * e `menu` (visibilidade do item).
 */
export function permissionBinding(): z.ZodObject<
  {
    kind: z.ZodEnum<{ PUBLIC: 'PUBLIC'; NOBODY: 'NOBODY'; GROUP: 'GROUP' }>;
    group: z.ZodDefault<z.ZodNullable<z.ZodString>>;
  },
  z.core.$strip
> {
  return z.object({
    kind: z
      .enum([
        E_PERMISSION_TARGET.PUBLIC,
        E_PERMISSION_TARGET.NOBODY,
        E_PERMISSION_TARGET.GROUP,
      ])
      .describe(
        'Alvo: PUBLIC (qualquer pessoa, inclusive sem login), NOBODY ' +
          '(ninguem) ou GROUP (apenas o grupo informado em `group`). Para GROUP ' +
          'vale a regra de intersecao: o usuario tambem precisa da permissao ' +
          'global correspondente no seu grupo.',
      ),
    group: z
      .string()
      .trim()
      .nullable()
      .default(null)
      .describe(
        'Id do grupo liberado quando `kind` = GROUP; null caso contrario.',
      ),
  });
}

/**
 * Escopo de sessao. Nao entra em schema nenhum: o controller le de
 * `request.user` e mescla no payload do use-case. Qualquer valor destes campos
 * vindo no corpo da requisicao e ignorado por construcao.
 *
 * Estavam declarados identicos em `users` e `user-groups`.
 */

/** Quem pediu a consulta. */
export type RequesterScope = {
  user?: Merge<Pick<IUser, '_id'>, { role: ValueOf<typeof E_ROLE> }>;
};

/** Quem executou a acao. */
export type ActorScope = { actorId: string };
