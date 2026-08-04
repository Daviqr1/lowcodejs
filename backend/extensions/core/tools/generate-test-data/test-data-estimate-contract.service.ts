/**
 * Estimativa de tamanho e teto de inserção física para a geração de dados de
 * teste. Em vez de um teto fixo (antes: 10.000 hardcoded), o número de registros
 * realmente inseridos é derivado de um orçamento de bytes (disco/Mongo) dividido
 * pelo tamanho médio estimado de uma linha da tabela. Acima desse teto, o
 * progresso é simulado.
 */

/** Teto absoluto de inserções físicas, independente do orçamento. */
export const HARD_REAL_CAP = 1_000_000;

/** Lote de `insertMany` (também é o pico de linhas em memória por vez). */
export const BATCH_SIZE = 1_000;

/**
 * Orçamento de bytes para a inserção física real. Default ~1 GiB; pode ser
 * sobrescrito via env `GENERATE_TEST_DATA_MAX_BYTES`. É o que protege schemas
 * "pesados": linhas grandes reduzem quantos registros cabem no orçamento.
 */

export type LooseField = {
  native?: boolean;
  type?: string;
  format?: string | null;
  slug?: string;
};

export type LooseTable = {
  fields?: LooseField[];
};

export type TestDataEstimate = {
  requested: number;
  rowBytes: number;
  realTargetQuantity: number;
  simulatedQuantity: number;
  estimatedRealBytes: number;
  estimatedRealBytesHuman: string;
  cappedBy: 'requested' | 'hard_cap' | 'budget';
  willSimulate: boolean;
  warnings: string[];
};

export abstract class TestDataEstimateContractService {
  /**
   * Orcamento de bytes para a insercao fisica real. Default ~1 GiB; pode ser
   * sobrescrito via env `GENERATE_TEST_DATA_MAX_BYTES`. E o que protege schemas
   * "pesados": linhas grandes reduzem quantos registros cabem no orcamento.
   */
  abstract getStorageBudgetBytes(): number;
  /** Tamanho medio estimado (bytes) de uma linha gerada para a tabela. */
  abstract estimateRowSizeBytes(table: LooseTable): number;
  /**
   * Teto de insercoes fisicas para a tabela: o menor entre a quantidade pedida,
   * o teto absoluto e o que cabe no orcamento de bytes.
   */
  abstract resolveRealTargetQuantity(
    rowBytes: number,
    quantity: number,
  ): number;
  abstract formatBytes(bytes: number): string;
  /** Monta a estimativa apresentada ao usuario ANTES de disparar a geracao. */
  abstract buildEstimate(table: LooseTable, quantity: number): TestDataEstimate;
}
