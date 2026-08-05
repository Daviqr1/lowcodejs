import type { z } from 'zod';
import { toJSONSchema } from 'zod';

/**
 * Blocos de erro dos `*.schema.ts` (documentacao OpenAPI). Sao valores de
 * escopo de modulo, avaliados no import junto com o proprio schema — o que
 * variava entre as copias era so `description`, a mensagem e a lista de
 * `cause`.
 *
 * `errors` precisa estar declarado em todo bloco: o Fastify remove da resposta
 * qualquer propriedade fora do schema, e os controllers propagam `errors`.
 */

type ErrorResponseSchema = {
  description: string;
  type: 'object';
  properties: {
    message: { type: 'string'; enum?: string[]; description?: string };
    code: { type: 'number'; enum: number[] };
    cause: { type: 'string'; enum: string[] };
    errors: {
      type: 'object';
      additionalProperties: { type: 'string' };
      description?: string;
    };
  };
};

export const buildErrorResponse = (
  code: number,
  cause: string | string[],
  options: {
    description: string;
    message?: string | string[];
    /** So quando o schema original documentava o campo. */
    messageDescription?: string;
    errorsDescription?: string;
  },
): ErrorResponseSchema => {
  const causes = [cause].flat();
  const messages = [options.message ?? []].flat();

  const message: ErrorResponseSchema['properties']['message'] = {
    type: 'string',
  };
  if (messages.length > 0) message.enum = messages;
  if (options.messageDescription)
    message.description = options.messageDescription;

  const errors: ErrorResponseSchema['properties']['errors'] = {
    type: 'object',
    additionalProperties: { type: 'string' },
  };
  if (options.errorsDescription) errors.description = options.errorsDescription;

  return {
    description: options.description,
    type: 'object',
    properties: {
      message,
      code: { type: 'number', enum: [code] },
      cause: { type: 'string', enum: causes },
      errors,
    },
  };
};

/** 401 do `AuthenticationMiddleware` — identico em 129 rotas. */
export const UnauthorizedResponse = buildErrorResponse(
  401,
  'AUTHENTICATION_REQUIRED',
  {
    description: 'Não autorizado - Autenticação necessária',
    message: 'Autenticação necessária',
  },
);

/**
 * Entrada da rota (`body`/`querystring`/`params`) derivada do schema Zod, para
 * que o validator seja a fonte unica: o Zod declara a regra, o AJV do Fastify
 * valida e o @fastify/swagger documenta o mesmo JSON Schema.
 *
 * As mensagens em PT-BR sobrevivem porque cada `check` do Zod vira a chave AJV
 * correspondente dentro de `errorMessage`, lido pelo plugin `ajv-errors` que o
 * kernel ja registra.
 *
 * `.transform()` e `.preprocess()` passam: em `io: 'input'` o que importa e a
 * forma que CHEGA, e a transformacao acontece depois. (Em modo de saida o
 * proprio Zod recusa: "Transforms cannot be represented in JSON Schema".)
 *
 * **`.refine()` e descartado sem aviso.** Regra que cruza campos ("url e
 * obrigatoria quando type=EXTERNAL") nao tem representacao em JSON Schema, e o
 * Zod simplesmente a omite. O schema da rota descreve a **forma**; quem garante
 * a regra cruzada e o `.parse()` do controller. Por isso ele nao sai.
 */

/** Nome do check no Zod → palavra-chave equivalente no JSON Schema/AJV. */
const KEYWORD_BY_CHECK: Record<string, string> = {
  min_length: 'minLength',
  max_length: 'maxLength',
  multiple_of: 'multipleOf',
  mime_type: 'contentMediaType',
};

type CheckDef = {
  check: string;
  inclusive?: boolean;
  error?: unknown;
};

/** A mensagem do Zod pode ser string ou funcao; normaliza para string. */
function resolveMessage(error: unknown): string | null {
  if (typeof error === 'string') return error;
  if (typeof error !== 'function') return null;

  const produced: unknown = error({});
  if (typeof produced === 'string') return produced;
  return null;
}

/**
 * Palavras-chave que a mensagem deste check deve cobrir. Comparacao numerica
 * muda de palavra conforme `inclusive`, e formato de string cai em `format` ou
 * `pattern` (email produz os dois), entao o alvo depende do que foi emitido.
 */
function keywordsFor(
  check: CheckDef,
  emitted: Record<string, unknown>,
): string[] {
  if (check.check === 'greater_than') {
    if (check.inclusive) return ['minimum'];
    return ['exclusiveMinimum'];
  }

  if (check.check === 'less_than') {
    if (check.inclusive) return ['maximum'];
    return ['exclusiveMaximum'];
  }

  if (check.check === 'length_equals') return ['minLength', 'maxLength'];

  if (check.check === 'string_format') {
    return ['format', 'pattern'].filter((keyword) => keyword in emitted);
  }

  const mapped = KEYWORD_BY_CHECK[check.check];
  if (mapped) return [mapped];
  return [];
}

type JsonSchemaNode = Record<string, unknown>;

/**
 * Copia rasa tipada de um no do JSON Schema. E copia so na superficie: os
 * filhos continuam sendo as mesmas referencias, entao percorrer por aqui e
 * mutar um filho alcanca a arvore de verdade.
 */
function asNode(value: unknown): JsonSchemaNode | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const node: JsonSchemaNode = {};
  Object.assign(node, value);
  return node;
}

function errorMessageOf(node: JsonSchemaNode): Record<string, unknown> {
  return asNode(node.errorMessage) ?? {};
}

/**
 * Campo ausente dispara `required` no objeto pai, nao `type` na propriedade.
 * Promove a mensagem de tipo de cada propriedade obrigatoria para o
 * `errorMessage.required` do pai, que e onde o `ajv-errors` vai busca-la.
 */
function liftRequiredMessages(node: unknown): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) liftRequiredMessages(item);
    return;
  }

  const record = asNode(node);
  if (!record) return;

  const properties = asNode(record.properties);
  if (!properties) return;

  for (const child of Object.values(properties)) liftRequiredMessages(child);

  const required = record.required;
  if (!Array.isArray(required)) return;

  const messages: Record<string, string> = {};
  for (const name of required) {
    if (typeof name !== 'string') continue;

    const property = asNode(properties[name]);
    if (!property) continue;

    const typeMessage = errorMessageOf(property).type;
    if (typeof typeMessage === 'string') messages[name] = typeMessage;
  }

  if (Object.keys(messages).length === 0) return;

  const own = errorMessageOf(record);
  Object.assign(node, { errorMessage: { ...own, required: messages } });
}

export function zodToRouteSchema(schema: z.ZodType): JsonSchemaNode {
  const json = toJSONSchema(schema, {
    target: 'draft-7',
    // Valida o que CHEGA: campo com `.default()` nao entra em `required`.
    io: 'input',
    override: (context) => {
      const node: JsonSchemaNode = context.jsonSchema;
      const definition: {
        type?: string;
        checks?: { _zod: { def: CheckDef } }[];
        error?: unknown;
      } = context.zodSchema._zod.def;

      const messages = errorMessageOf(node);

      const typeMessage = resolveMessage(definition.error);
      if (typeMessage) {
        messages.type = typeMessage;

        // `z.email('msg')` guarda a mensagem no proprio schema, nao num check,
        // mas o AJV vai reprovar por `format`/`pattern`. Cobre as duas.
        for (const keyword of ['format', 'pattern']) {
          if (keyword in node) messages[keyword] = typeMessage;
        }
      }

      for (const check of definition.checks ?? []) {
        const checkDefinition = check._zod.def;
        const message = resolveMessage(checkDefinition.error);
        if (!message) continue;

        for (const keyword of keywordsFor(checkDefinition, node)) {
          messages[keyword] = message;
        }
      }

      // `io: 'input'` nao emite o fechamento do objeto; `z.object` estrito
      // rejeita chave desconhecida, `.loose()` ja veio com `additionalProperties`.
      if (definition.type === 'object' && !('additionalProperties' in node)) {
        node.additionalProperties = false;
      }

      if (Object.keys(messages).length > 0) node.errorMessage = messages;
    },
  });

  const result: JsonSchemaNode = { ...json };
  // O Fastify compila com o AJV dele; declarar outro meta-schema so atrapalha.
  delete result.$schema;

  liftRequiredMessages(result);

  return result;
}
