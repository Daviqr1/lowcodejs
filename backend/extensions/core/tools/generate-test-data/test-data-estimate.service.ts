import { Service } from 'fastify-decorators';

import {
  HARD_REAL_CAP,
  type LooseField,
  type LooseTable,
  type TestDataEstimate,
  TestDataEstimateContractService,
} from './test-data-estimate-contract.service';

/** Overhead base por documento no Mongo: _id, timestamps, trashed, __v, etc. */
const BASE_DOC_OVERHEAD_BYTES = 150;
/** Overhead de BSON por chave de campo (nome + tipo). */
const FIELD_KEY_OVERHEAD_BYTES = 8;

@Service()
export default class TestDataEstimateService implements TestDataEstimateContractService {
  getStorageBudgetBytes(): number {
    const raw = Number(process.env.GENERATE_TEST_DATA_MAX_BYTES);
    if (Number.isFinite(raw) && raw > 0) return raw;
    return 1024 * 1024 * 1024; // 1 GiB
  }

  /** Bytes estimados do VALOR de um campo, espelhando `generateMockRow`. */
  private estimateFieldValueBytes(field: LooseField): number {
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
      case 'USER_GROUP':
      case 'FILE':
        return 30; // array com um ObjectId/string
      case 'FIELD_GROUP':
        return 4; // array vazio
      default:
        return 0;
    }
  }

  /** Tamanho médio estimado (bytes) de uma linha gerada para a tabela. */
  estimateRowSizeBytes(table: LooseTable): number {
    let bytes = BASE_DOC_OVERHEAD_BYTES;

    for (const raw of table.fields ?? []) {
      const field = raw;
      if (field.native) continue;
      const valueBytes = this.estimateFieldValueBytes(field);
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
  resolveRealTargetQuantity(rowBytes: number, quantity: number): number {
    const budgetCap = Math.max(
      1,
      Math.floor(this.getStorageBudgetBytes() / Math.max(1, rowBytes)),
    );
    return Math.min(quantity, HARD_REAL_CAP, budgetCap);
  }

  formatBytes(bytes: number): string {
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

  /** Monta a estimativa apresentada ao usuário ANTES de disparar a geração. */
  buildEstimate(table: LooseTable, quantity: number): TestDataEstimate {
    const rowBytes = this.estimateRowSizeBytes(table);
    const realTargetQuantity = this.resolveRealTargetQuantity(
      rowBytes,
      quantity,
    );
    const simulatedQuantity = Math.max(0, quantity - realTargetQuantity);
    const estimatedRealBytes = realTargetQuantity * rowBytes;
    const willSimulate = simulatedQuantity > 0;

    const budgetCap = Math.max(
      1,
      Math.floor(this.getStorageBudgetBytes() / Math.max(1, rowBytes)),
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
        `Teto limitado pelo orçamento de ${this.formatBytes(
          this.getStorageBudgetBytes(),
        )} de dados reais (cada linha desta tabela ocupa ~${this.formatBytes(
          rowBytes,
        )}).`,
      );
    }

    if (estimatedRealBytes >= 200 * 1024 * 1024) {
      warnings.push(
        `A inserção real (~${this.formatBytes(estimatedRealBytes)}) pode levar ` +
          `vários minutos e ocupar esse espaço no MongoDB.`,
      );
    }

    return {
      requested: quantity,
      rowBytes,
      realTargetQuantity,
      simulatedQuantity,
      estimatedRealBytes,
      estimatedRealBytesHuman: this.formatBytes(estimatedRealBytes),
      cappedBy,
      willSimulate,
      warnings,
    };
  }
}
