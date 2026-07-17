import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  type IField,
  type IFieldPermissions,
} from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';

export async function buildSimpleMediaFields(
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

  const titleField = await createField({
    name: 'Título',
    slug: 'titulo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: true,
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

  const descriptionField = await createField({
    name: 'Descrição',
    slug: 'descricao',
    type: E_FIELD_TYPE.TEXT_LONG,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.PLAIN_TEXT,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: false,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: 100,
    widthInList: 50,
    widthInDetail: null,
  });

  const imageField = await createField({
    name: 'Imagem',
    slug: 'imagem',
    type: E_FIELD_TYPE.FILE,
    required: false,
    multiple: false,
    format: null,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: false,
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
