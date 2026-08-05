import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';

import type { CloneTableDeps } from '../clone-table.types';

import type {
  TableTemplateDescriptor,
  TemplateFieldSet,
} from './table-template-contract.service';
import { createTemplateField } from './template-field-helper';

export const DOCUMENT_TEMPLATE: TableTemplateDescriptor = {
  description: 'Documento',
  style: E_TABLE_STYLE.DOCUMENT,
  beforeSave: null,
  async buildFields(deps: CloneTableDeps): Promise<TemplateFieldSet> {
    return buildDocumentFields(deps.fieldRepository);
  },
};

export async function buildDocumentFields(
  fieldRepository: FieldContractRepository,
): Promise<TemplateFieldSet> {
  const createdFields: IField[] = [];

  const createField = createTemplateField(fieldRepository, createdFields);

  const indexField = await createField({
    name: 'Indice',
    slug: 'indice',
    type: E_FIELD_TYPE.CATEGORY,
    required: true,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    locked: false,
    widthInForm: 50,
    widthInList: 50,
  });

  const titleField = await createField({
    name: 'Título',
    slug: 'titulo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    locked: false,
    widthInForm: 50,
    widthInList: 50,
  });

  const textField = await createField({
    name: 'Texto',
    slug: 'texto',
    type: E_FIELD_TYPE.TEXT_LONG,
    required: true,
    format: E_FIELD_FORMAT.RICH_TEXT,
    permissions: buildFieldPermissions(false, true, true),
    locked: false,
  });

  const orderList = [indexField._id, titleField._id, textField._id];

  const orderForm = [titleField._id, indexField._id, textField._id];

  const orderFilter = [indexField._id, titleField._id];

  const orderDetail = [titleField._id, indexField._id, textField._id];

  return {
    fields: createdFields,
    orderList,
    orderForm,
    orderFilter,
    orderDetail,
  };
}
