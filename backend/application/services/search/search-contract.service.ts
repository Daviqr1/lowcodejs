/**
 * Preparo de texto de busca para consulta. Fonte unica — a mesma logica existia
 * em 3 lugares: `SearchNormalizer` (estatico), uma copia byte-identica privada
 * no `MongooseFieldGroupBuilder` e um delegate no `MongooseQueryBuilder`, que 7
 * repositorios injetavam por inteiro so para alcancar este metodo.
 */
export abstract class SearchContractService {
  /**
   * Escapa os metacaracteres de regex. Obrigatorio em qualquer `$regex` montado
   * a partir de entrada do usuario — sem isso o termo e interpretado como
   * padrao (ReDoS / injecao de regex).
   */
  abstract escape(value: string): string;

  /**
   * Termo escapado e com cada vogal/consoante acentuavel trocada por uma classe
   * que casa todas as variantes — busca insensivel a acento e caixa.
   */
  abstract normalize(search: string): string;
}
