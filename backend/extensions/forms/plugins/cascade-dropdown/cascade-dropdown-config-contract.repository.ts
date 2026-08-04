import type { CascadeDropdownConfig } from './cascade-dropdown.types';

export abstract class CascadeDropdownConfigContractRepository {
  abstract findByTarget(
    targetTableSlug: string,
    targetFieldId: string,
  ): Promise<CascadeDropdownConfig | null>;
  abstract save(data: CascadeDropdownConfig): Promise<CascadeDropdownConfig>;
  /**
   * Apaga toda config que referencie o campo, seja como alvo, pai, filho ou
   * filtro. Devolve quantas sairam.
   */
  abstract deleteForField(params: {
    tableSlug: string;
    fieldId: string;
    fieldSlug?: string;
  }): Promise<number>;
}
