import { E_TABLE_STYLE } from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';

import type { CloneTableDeps } from '../clone-table.types';

import { buildSimpleMediaFields } from './media-helpers';
import type {
  TableTemplateDescriptor,
  TemplateFieldSet,
} from './table-template-contract.service';

export const MOSAIC_TEMPLATE: TableTemplateDescriptor = {
  description: 'Mosaico',
  style: E_TABLE_STYLE.MOSAIC,
  beforeSave: null,
  async buildFields(deps: CloneTableDeps): Promise<TemplateFieldSet> {
    return buildMosaicFields(deps.fieldRepository);
  },
};

export async function buildMosaicFields(
  fieldRepository: FieldContractRepository,
): Promise<TemplateFieldSet> {
  return await buildSimpleMediaFields(fieldRepository);
}
