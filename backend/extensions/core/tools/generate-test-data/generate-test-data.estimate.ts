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
export function getStorageBudgetBytes(): number {
  const raw = Number(process.env.GENERATE_TEST_DATA_MAX_BYTES);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return 1024 * 1024 * 1024; // 1 GiB
}

/** Overhead base por documento no Mongo: _id, timestamps, trashed, __v, etc. */
const BASE_DOC_OVERHEAD_BYTES = 150;
/** Overhead de BSON por chave de campo (nome + tipo). */
const FIELD_KEY_OVERHEAD_BYTES = 8;

type LooseField = {
  native?: boolean;
  type?: string;
  format?: string | null;
  slug?: string;
};

type LooseTable = {
  fields?: LooseField[];
};

/** Bytes estimados do VALOR de um campo, espelhando `generateMockRow`. */
function estimateFieldValueBytes(field: LooseField): number {
  switch (field.type) {
    case 'TEXT_SHORT':
      switch (field.format) {
        case 'EMAIL':
          return 30;
        case 'URL':
          return 45;
        case 'INTEGER':
          return 8;
        case 'DECIMAL':
          return 10;
        case 'PHONE':
          return 16;
        case 'CNPJ':
          return 20;
        case 'CPF':
          return 16;
        default:
          return 50;
      }
    case 'TEXT_LONG':
      if (field.format === 'RICH_TEXT') return 110;
      return 130;
    case 'DATE':
      return 28;
    case 'DROPDOWN':
    case 'RELATIONSHIP':
    case 'USER':
    case 'FILE':
      return 30; // array com um ObjectId/string
    case 'FIELD_GROUP':
      return 4; // array vazio
    default:
      return 0;
  }
}

/** Tamanho médio estimado (bytes) de uma linha gerada para a tabela. */
export function estimateRowSizeBytes(table: LooseTable): number {
  let bytes = BASE_DOC_OVERHEAD_BYTES;

  for (const raw of table.fields ?? []) {
    const field = raw;
    if (field.native) continue;
    const valueBytes = estimateFieldValueBytes(field);
    if (valueBytes === 0) continue;
    const keyBytes = (field.slug?.length ?? 12) + FIELD_KEY_OVERHEAD_BYTES;
    bytes += valueBytes + keyBytes;
  }

  return bytes;
}

/**
 * Teto de inserções físicas para a tabela: o menor entre a quantidade pedida, o
 * teto absoluto e o que cabe no orçamento de bytes.
 */
export function resolveRealTargetQuantity(
  rowBytes: number,
  quantity: number,
): number {
  const budgetCap = Math.max(
    1,
    Math.floor(getStorageBudgetBytes() / Math.max(1, rowBytes)),
  );
  return Math.min(quantity, HARD_REAL_CAP, budgetCap);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  let human = value.toFixed(1);
  if (value >= 100) human = String(Math.round(value));
  return `${human} ${units[unit]}`;
}

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

/** Monta a estimativa apresentada ao usuário ANTES de disparar a geração. */
export function buildEstimate(
  table: LooseTable,
  quantity: number,
): TestDataEstimate {
  const rowBytes = estimateRowSizeBytes(table);
  const realTargetQuantity = resolveRealTargetQuantity(rowBytes, quantity);
  const simulatedQuantity = Math.max(0, quantity - realTargetQuantity);
  const estimatedRealBytes = realTargetQuantity * rowBytes;
  const willSimulate = simulatedQuantity > 0;

  const budgetCap = Math.max(
    1,
    Math.floor(getStorageBudgetBytes() / Math.max(1, rowBytes)),
  );
  let cappedBy: TestDataEstimate['cappedBy'] = 'requested';
  if (realTargetQuantity < quantity) {
    cappedBy = 'hard_cap';
    if (budgetCap < HARD_REAL_CAP) cappedBy = 'budget';
  }

  const warnings: string[] = [];

  if (willSimulate) {
    warnings.push(
      `Apenas ${realTargetQuantity.toLocaleString('pt-BR')} registros serão ` +
        `inseridos de verdade; os outros ${simulatedQuantity.toLocaleString(
          'pt-BR',
        )} têm o progresso simulado.`,
    );
  }

  if (cappedBy === 'budget') {
    warnings.push(
      `Teto limitado pelo orçamento de ${formatBytes(
        getStorageBudgetBytes(),
      )} de dados reais (cada linha desta tabela ocupa ~${formatBytes(
        rowBytes,
      )}).`,
    );
  }

  if (estimatedRealBytes >= 200 * 1024 * 1024) {
    warnings.push(
      `A inserção real (~${formatBytes(estimatedRealBytes)}) pode levar ` +
        `vários minutos e ocupar esse espaço no MongoDB.`,
    );
  }

  return {
    requested: quantity,
    rowBytes,
    realTargetQuantity,
    simulatedQuantity,
    estimatedRealBytes,
    estimatedRealBytesHuman: formatBytes(estimatedRealBytes),
    cappedBy,
    willSimulate,
    warnings,
  };
}
