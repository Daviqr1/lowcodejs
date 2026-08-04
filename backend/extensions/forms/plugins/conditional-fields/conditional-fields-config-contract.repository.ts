import type { ConditionalFieldsConfig } from './conditional-fields.types';

export abstract class ConditionalFieldsConfigContractRepository {
  /** Sem config gravada devolve uma vazia (`rules: []`), nunca `null`. */
  abstract findByTable(
    tableId: string,
    tableSlug: string,
  ): Promise<ConditionalFieldsConfig>;
  abstract save(
    config: ConditionalFieldsConfig,
  ): Promise<ConditionalFieldsConfig>;
}
