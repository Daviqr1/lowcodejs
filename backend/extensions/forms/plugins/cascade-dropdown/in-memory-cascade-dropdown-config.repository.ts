import { CascadeDropdownConfigContractRepository } from './cascade-dropdown-config-contract.repository';
import type { CascadeDropdownConfig } from './cascade-dropdown.types';

/**
 * Double para specs unitarios. Ignorado pelo scanner do DI por convencao
 * (`in-memory-*`).
 */
export class InMemoryCascadeDropdownConfigRepository implements CascadeDropdownConfigContractRepository {
  public items: CascadeDropdownConfig[] = [];

  async findByTarget(
    targetTableSlug: string,
    targetFieldId: string,
  ): Promise<CascadeDropdownConfig | null> {
    return (
      this.items.find(
        (item) =>
          item.targetTableSlug === targetTableSlug &&
          item.targetFieldId === targetFieldId,
      ) ?? null
    );
  }

  async save(data: CascadeDropdownConfig): Promise<CascadeDropdownConfig> {
    const index = this.items.findIndex(
      (item) =>
        item.targetTableSlug === data.targetTableSlug &&
        item.targetFieldId === data.targetFieldId,
    );
    if (index >= 0) this.items[index] = data;
    else this.items.push(data);
    return data;
  }

  async deleteForField(params: {
    tableSlug: string;
    fieldId: string;
    fieldSlug?: string;
  }): Promise<number> {
    const before = this.items.length;
    this.items = this.items.filter(
      (item) =>
        !(
          (item.targetTableSlug === params.tableSlug &&
            item.targetFieldId === params.fieldId) ||
          (item.sourceTableSlug === params.tableSlug &&
            item.childFieldId === params.fieldId)
        ),
    );
    return before - this.items.length;
  }
}
