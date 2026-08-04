export type DateRangeFilter = { $gte?: Date; $lte?: Date };

export type TextFilter = { $regex: string; $options: string };

export type RefInFilter = { $in: string[] };

/**
 * Fragmento de filtro Mongo por valor de campo, independente de onde o campo
 * mora. Fonte unica: os mesmos tres ramos (texto por `$regex`, ref por `$in`,
 * data por faixa de dia UTC) estavam escritos duas vezes — uma no
 * `QueryBuilder` para campo top-level, outra no `FieldGroupBuilder` para campo
 * dentro de `FIELD_GROUP`. So o path mudava, e o ramo de data era byte-a-byte
 * igual nos dois.
 *
 * Vive fora dos dois builders porque o `QueryBuilder` ja injeta o
 * `FieldGroupBuilder` — o caminho inverso fecharia ciclo no DI.
 */
export abstract class FieldFilterContractService {
  /** Busca parcial, sem caixa e com o termo escapado. */
  abstract text(value: unknown): TextFilter;

  /** Lista separada por virgula vira `$in`. */
  abstract refIn(value: unknown): RefInFilter;

  /**
   * Faixa do dia em UTC (inicio do `initial`, fim do `final`). `null` quando
   * nenhum dos dois lados foi informado.
   */
  abstract dateRange(initial: unknown, final: unknown): DateRangeFilter | null;
}
