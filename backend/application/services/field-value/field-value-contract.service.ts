import type { E_FIELD_TYPE, IField } from '@application/core/entity.core';

export type FieldType = (typeof E_FIELD_TYPE)[keyof typeof E_FIELD_TYPE];

export type FieldValueFormatContext = {
  /** Tipo do campo (tabelas dinamicas). */
  fieldType?: FieldType;
  /** Quando o campo for FILE, decidir entre filename e URL. */
  preferUrlForFiles?: boolean;
};

/** Resolve valores de display de RELATIONSHIP para os ids correspondentes. */
export type RelationshipValueResolver = (raw: string) => string[];

/**
 * Leitura, coercao e formatacao de valor de campo de tabela dinamica.
 *
 * Fonte unica: a mesma pergunta — "qual e o tipo real deste valor e como ele
 * vira/sai de texto" — tinha 4 respostas diferentes no backend:
 * `convertValue` (heuristica sem tipo, sandbox), `coerceValue` (dirigida por
 * `E_FIELD_TYPE`, import de CSV), `formatCellValue` (export de CSV) e
 * `normalizeDefaultValue` (create/update de campo).
 */
export abstract class FieldValueContractService {
  /** Tipo do campo com este slug, ou `undefined`. */
  abstract typeOf(fields: IField[], slug: string): FieldType | undefined;

  /**
   * Le o valor do documento tolerando as duas grafias do slug — o Mongo guarda
   * chave com underscore, o campo e definido com hifen.
   */
  abstract read(doc: Record<string, unknown>, slug: string): unknown;

  /**
   * Heuristica sem tipo declarado: `"true"`/`"false"` viram boolean, numerico
   * vira number, data ISO vira Date. Usada onde nao ha `IField` em maos.
   */
  abstract infer(value: unknown): unknown;

  /**
   * Coercao dirigida pelo `type`/`format` do campo. `undefined` significa
   * "nao importavel" (USER, USER_GROUP, FILE, FIELD_GROUP) ou celula vazia.
   */
  abstract coerce(
    raw: string,
    field: IField,
    resolveRelationship?: RelationshipValueResolver,
  ): unknown;

  /** Representacao textual segura para CSV. */
  abstract format(value: unknown, context?: FieldValueFormatContext): string;

  /**
   * Normaliza `defaultValue` para a forma que o tipo do campo armazena:
   * string para TEXT_SHORT/TEXT_LONG/DATE, string[] para os de multipla
   * escolha, `null` para o resto.
   */
  abstract normalizeDefault(
    type: string,
    defaultValue: string | string[] | null | undefined,
  ): string | string[] | null;

  /** `true` quando ha rotulo repetido (comparacao sem caixa nem espaco). */
  abstract hasDuplicateLabels(
    dropdown: Array<{ label: string }> | null | undefined,
  ): boolean;
}
