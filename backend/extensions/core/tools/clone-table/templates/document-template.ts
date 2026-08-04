import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
  type IFieldPermissions,
} from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';

import type { CloneTableDeps } from '../clone-table.types';

import type {
  TableTemplateDescriptor,
  TemplateFieldSet,
} from './table-template-contract.service';

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
): Promise<{
  fields: IField[];
  orderList: string[];
  orderForm: string[];
  orderFilter: string[];
  orderDetail: string[];
}> {
  const createdFields: IField[] = [];

  const createField = async (payload: {
    name: string;
    slug: string;
    type: IField['type'];
    required: boolean;
    multiple: boolean;
    format: IField['format'];
    permissions: IFieldPermissions;
    showInFilter: boolean;
    defaultValue: IField['defaultValue'];
    locked: boolean;
    relationship: IField['relationship'];
    dropdown: IField['dropdown'];
    category: IField['category'];
    group: IField['group'];
    widthInForm: IField['widthInForm'];
    widthInList: IField['widthInList'];
    widthInDetail: IField['widthInDetail'];
  }): Promise<IField> => {
    const field = await fieldRepository.create({
      ...payload,
    });
    createdFields.push(field);
    return field;
  };

  const indexField = await createField({
    name: 'Indice',
    slug: 'indice',
    type: E_FIELD_TYPE.CATEGORY,
    required: true,
    multiple: false,
    format: null,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    defaultValue: null,
    locked: false,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: 50,
    widthInList: 50,
    widthInDetail: null,
  });

  const titleField = await createField({
    name: 'Título',
    slug: 'titulo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    defaultValue: null,
    locked: false,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: 50,
    widthInList: 50,
    widthInDetail: null,
  });

  const textField = await createField({
    name: 'Texto',
    slug: 'texto',
    type: E_FIELD_TYPE.TEXT_LONG,
    required: true,
    multiple: false,
    format: E_FIELD_FORMAT.RICH_TEXT,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: false,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: 100,
    widthInList: 100,
    widthInDetail: null,
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
