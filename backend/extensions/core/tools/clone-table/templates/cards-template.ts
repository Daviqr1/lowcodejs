import slugify from 'slugify';

import { right } from '@application/core/either.core';
import {
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  FIELD_NATIVE_LIST,
  type IField,
} from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { TableCreatePayload } from '@application/repositories/table/table-contract.repository';

import type {
  CloneTableDeps,
  CloneTableResponse,
  CloneTableUseCasePayload,
} from '../clone-table.types';

import { buildSimpleMediaFields } from './media-helpers';

export async function createCardsTemplate(
  payload: CloneTableUseCasePayload,
  deps: CloneTableDeps,
): Promise<CloneTableResponse> {
  const newSlug = slugify(payload.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  const { fields, orderList, orderForm, orderFilter, orderDetail } =
    await buildCardsFields(deps.fieldRepository);
  const nativeFields = await deps.fieldRepository.createMany(FIELD_NATIVE_LIST);
  const nativeFieldIds = nativeFields.map((field) => field._id);

  const _schema = deps.schemaBuilder.build([...nativeFields, ...fields]);

  const createPayload: TableCreatePayload = {
    _schema,
    name: payload.name,
    slug: newSlug,
    description: 'Cards',
    type: E_TABLE_TYPE.TABLE,
    logo: null,
    fields: [...nativeFieldIds, ...fields.map((f) => f._id)],
    style: E_TABLE_STYLE.CARD,
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

export async function buildCardsFields(
  fieldRepository: FieldContractRepository,
): Promise<{
  fields: IField[];
  orderList: string[];
  orderForm: string[];
  orderFilter: string[];
  orderDetail: string[];
}> {
  const base = await buildSimpleMediaFields(fieldRepository);
  return {
    fields: [...base.fields],
    orderList: [...base.orderList],
    orderForm: [...base.orderForm],
    orderFilter: [...base.orderFilter],
    orderDetail: [...base.orderDetail],
  };
}
