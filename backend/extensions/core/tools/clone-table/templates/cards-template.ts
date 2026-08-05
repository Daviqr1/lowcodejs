import { E_TABLE_STYLE } from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';

import type { CloneTableDeps } from '../clone-table.types';

import { buildSimpleMediaFields } from './media-helpers';
import type {
  TableTemplateDescriptor,
  TemplateFieldSet,
} from './table-template-contract.service';

export const CARDS_TEMPLATE: TableTemplateDescriptor = {
  description: 'Cards',
  style: E_TABLE_STYLE.CARD,
  beforeSave: null,
  async buildFields(deps: CloneTableDeps): Promise<TemplateFieldSet> {
    return buildCardsFields(deps.fieldRepository);
  },
};

export async function buildCardsFields(
  fieldRepository: FieldContractRepository,
): Promise<TemplateFieldSet> {
  const base = await buildSimpleMediaFields(fieldRepository);
  return {
    fields: [...base.fields],
    orderList: [...base.orderList],
    orderForm: [...base.orderForm],
    orderFilter: [...base.orderFilter],
    orderDetail: [...base.orderDetail],
  };
}
