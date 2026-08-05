import { describe, expect, it } from 'vitest';
import z from 'zod';

import { zodToRouteSchema } from './schema.core';

/**
 * Este helper e a fonte unica de validacao de entrada: o mesmo JSON Schema
 * valida no AJV e documenta no OpenAPI. Um mapeamento errado aqui vira uma
 * regra que some da rota sem ninguem perceber, entao cada palavra-chave tem
 * caso proprio.
 */
describe('zodToRouteSchema', () => {
  it('nao declara outro meta-schema', () => {
    const schema = zodToRouteSchema(z.object({ name: z.string() }));

    expect(schema.$schema).toBeUndefined();
  });

  it('fecha objeto estrito e mantem objeto loose aberto', () => {
    const strict = zodToRouteSchema(z.object({ name: z.string() }));
    const loose = zodToRouteSchema(z.object({ name: z.string() }).loose());

    expect(strict.additionalProperties).toBe(false);
    expect(loose.additionalProperties).not.toBe(false);
  });

  it('tira do required o campo com default, que nao precisa chegar', () => {
    const schema = zodToRouteSchema(
      z.object({ page: z.coerce.number().default(1), name: z.string() }),
    );

    expect(schema.required).toEqual(['name']);
    expect(schema.properties).toMatchObject({ page: { default: 1 } });
  });

  describe('mensagens PT-BR viram errorMessage na palavra-chave certa', () => {
    function messagesOf(
      schema: z.ZodType,
      field: string,
    ): Record<string, unknown> {
      const json = zodToRouteSchema(z.object({ [field]: schema }));
      const properties = Object(json.properties);
      return Object(Object(properties[field]).errorMessage);
    }

    it('min e max de texto', () => {
      const messages = messagesOf(
        z.string().min(2, 'curto demais').max(4, 'longo demais'),
        'nome',
      );

      expect(messages).toEqual({
        minLength: 'curto demais',
        maxLength: 'longo demais',
      });
    });

    it('min e max numericos inclusivos', () => {
      const messages = messagesOf(
        z.number().min(1, 'minimo 1').max(9, 'maximo 9'),
        'idade',
      );

      expect(messages).toEqual({ minimum: 'minimo 1', maximum: 'maximo 9' });
    });

    it('comparacao numerica exclusiva', () => {
      const messages = messagesOf(z.number().gt(0, 'maior que zero'), 'saldo');

      expect(messages).toEqual({ exclusiveMinimum: 'maior que zero' });
    });

    it('multiplo', () => {
      const messages = messagesOf(
        z.number().multipleOf(5, 'multiplo de 5'),
        'valor',
      );

      expect(messages).toEqual({ multipleOf: 'multiplo de 5' });
    });

    it('regex vira pattern', () => {
      const messages = messagesOf(
        z.string().regex(/^a/, 'precisa comecar com a'),
        'codigo',
      );

      expect(messages).toEqual({ pattern: 'precisa comecar com a' });
    });

    it('email cobre format e pattern, que o Zod emite juntos', () => {
      const messages = messagesOf(z.email('email invalido'), 'email');

      expect(messages).toEqual({
        type: 'email invalido',
        format: 'email invalido',
        pattern: 'email invalido',
      });
    });

    it('mensagem de tipo do proprio schema', () => {
      const messages = messagesOf(
        z.string({ message: 'deve ser um texto' }),
        'nome',
      );

      expect(messages).toEqual({ type: 'deve ser um texto' });
    });
  });

  it('promove a mensagem de tipo para o required do objeto pai', () => {
    const schema = zodToRouteSchema(
      z.object({
        nome: z.string({ message: 'O nome é obrigatório' }),
        idade: z.number(),
      }),
    );

    // Campo ausente dispara `required` no pai, nao `type` na propriedade.
    expect(Object(schema.errorMessage).required).toEqual({
      nome: 'O nome é obrigatório',
    });
  });

  it('atravessa objeto aninhado', () => {
    const schema = zodToRouteSchema(
      z.object({
        endereco: z.object({ rua: z.string().min(1, 'rua obrigatoria') }),
      }),
    );

    const properties = Object(schema.properties);
    const endereco = Object(properties.endereco);
    const rua = Object(Object(endereco.properties).rua);

    expect(Object(rua.errorMessage)).toEqual({ minLength: 'rua obrigatoria' });
  });

  it('descreve a entrada de um schema com transform', () => {
    // Em `io: 'input'` a transformacao ainda nao aconteceu, entao a forma que
    // chega e representavel — o que falha e so o modo de saida.
    const schema = zodToRouteSchema(
      z
        .object({ slug: z.string().min(1, 'slug obrigatorio') })
        .transform((data) => ({ ...data, slug: data.slug.toLowerCase() })),
    );

    const slug = Object(Object(schema.properties).slug);
    expect(Object(slug.errorMessage)).toEqual({
      minLength: 'slug obrigatorio',
    });
  });

  it('descreve a entrada de um preprocess', () => {
    const schema = zodToRouteSchema(
      z.object({
        trashed: z
          .preprocess((value) => String(value), z.enum(['true', 'false']))
          .optional(),
      }),
    );

    expect(Object(schema.properties)).toMatchObject({
      trashed: { type: 'string', enum: ['true', 'false'] },
    });
  });
});
