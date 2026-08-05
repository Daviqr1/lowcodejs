import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  type IField,
} from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';

import type { TemplateFieldSet } from './table-template-contract.service';
import { createTemplateField } from './template-field-helper';

export async function buildSimpleMediaFields(
  fieldRepository: FieldContractRepository,
): Promise<TemplateFieldSet> {
  const createdFields: IField[] = [];

  const createField = createTemplateField(fieldRepository, createdFields);

  const titleField = await createField({
    name: 'Título',
    slug: 'titulo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: true,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    locked: false,
    widthInForm: 50,
    widthInList: 50,
  });

  const descriptionField = await createField({
    name: 'Descrição',
    slug: 'descricao',
    type: E_FIELD_TYPE.TEXT_LONG,
    format: E_FIELD_FORMAT.PLAIN_TEXT,
    permissions: buildFieldPermissions(false, true, true),
    locked: false,
    widthInList: 50,
  });

  const imageField = await createField({
    name: 'Imagem',
    slug: 'imagem',
    type: E_FIELD_TYPE.FILE,
    permissions: buildFieldPermissions(true, true, true),
    locked: false,
    widthInForm: 50,
    widthInList: 50,
  });

  const orderList = [imageField._id, titleField._id, descriptionField._id];

  const orderForm = [titleField._id, descriptionField._id, imageField._id];

  const orderFilter = [titleField._id];

  const orderDetail = [titleField._id, descriptionField._id, imageField._id];

  return {
    fields: createdFields,
    orderList,
    orderForm,
    orderFilter,
    orderDetail,
  };
}
