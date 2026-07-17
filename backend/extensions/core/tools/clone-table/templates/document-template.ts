import slugify from 'slugify';

import { right } from '@application/core/either.core';
import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  FIELD_NATIVE_LIST,
  type IField,
  type IFieldPermissions,
} from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { TableCreatePayload } from '@application/repositories/table/table-contract.repository';

import type {
  CloneTableDeps,
  CloneTableResponse,
  CloneTableUseCasePayload,
} from '../clone-table.types';

export async function createDocumentTemplate(
  payload: CloneTableUseCasePayload,
  deps: CloneTableDeps,
): Promise<CloneTableResponse> {
  const newSlug = slugify(payload.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  const { fields, orderList, orderForm, orderFilter, orderDetail } =
    await buildDocumentFields(deps.fieldRepository);
  const nativeFields = await deps.fieldRepository.createMany(FIELD_NATIVE_LIST);
  const nativeFieldIds = nativeFields.map((field) => field._id);

  const _schema = deps.schemaBuilder.build([...nativeFields, ...fields]);

  const createPayload: TableCreatePayload = {
    _schema,
    name: payload.name,
    slug: newSlug,
    description: 'Documento',
    type: E_TABLE_TYPE.TABLE,
    logo: null,
    fields: [...nativeFieldIds, ...fields.map((f) => f._id)],
    style: E_TABLE_STYLE.DOCUMENT,
    owner: payload.ownerId,
    fieldOrderList: [...nativeFieldIds, ...orderList],
    fieldOrderForm: [...nativeFieldIds, ...orderForm],
    fieldOrderFilter: [...nativeFieldIds, ...orderFilter],
    fieldOrderDetail: [...nativeFieldIds, ...orderDetail],
    methods: {
      onLoad: { code: null },
      beforeSave: { code: null },
      afterSave: { code: null },
    },
  };

  const newTable = await deps.tableRepository.create(createPayload);

  return right({
    table: newTable,
    fieldIdMap: {},
  });
}

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
