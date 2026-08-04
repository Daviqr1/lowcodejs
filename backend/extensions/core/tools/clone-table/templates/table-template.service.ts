import { Service } from 'fastify-decorators';

import { right } from '@application/core/either.core';
import { E_TABLE_TYPE, FIELD_NATIVE_LIST } from '@application/core/entity.core';
import type { TableCreatePayload } from '@application/repositories/table/table-contract.repository';

import {
  CALENDAR_TEMPLATE_ID,
  CARDS_TEMPLATE_ID,
  DOCUMENT_TEMPLATE_ID,
  FORUM_TEMPLATE_ID,
  KANBAN_TEMPLATE_ID,
  MOSAIC_TEMPLATE_ID,
} from '../clone-table.constants';
import type {
  CloneTableDeps,
  CloneTableResponse,
  CloneTableUseCasePayload,
} from '../clone-table.types';

import { CALENDAR_TEMPLATE } from './calendar-template';
import { CARDS_TEMPLATE } from './cards-template';
import { DOCUMENT_TEMPLATE } from './document-template';
import { FORUM_TEMPLATE } from './forum-template';
import { KANBAN_TEMPLATE } from './kanban-template';
import { MOSAIC_TEMPLATE } from './mosaic-template';
import {
  type TableTemplateDescriptor,
  TableTemplateContractService,
} from './table-template-contract.service';

const TEMPLATES: Record<string, TableTemplateDescriptor> = {
  [KANBAN_TEMPLATE_ID]: KANBAN_TEMPLATE,
  [CARDS_TEMPLATE_ID]: CARDS_TEMPLATE,
  [MOSAIC_TEMPLATE_ID]: MOSAIC_TEMPLATE,
  [DOCUMENT_TEMPLATE_ID]: DOCUMENT_TEMPLATE,
  [FORUM_TEMPLATE_ID]: FORUM_TEMPLATE,
  [CALENDAR_TEMPLATE_ID]: CALENDAR_TEMPLATE,
};

@Service()
export default class TableTemplateService implements TableTemplateContractService {
  findById(baseTableId: string): TableTemplateDescriptor | null {
    return TEMPLATES[baseTableId] ?? null;
  }

  async create(
    descriptor: TableTemplateDescriptor,
    payload: CloneTableUseCasePayload,
    deps: CloneTableDeps,
  ): Promise<CloneTableResponse> {
    const built = await descriptor.buildFields(deps);
    const nativeFields =
      await deps.fieldRepository.createMany(FIELD_NATIVE_LIST);
    const nativeFieldIds = nativeFields.map((field) => field._id);

    const createPayload: TableCreatePayload = {
      _schema: deps.schemaBuilder.build(
        [...nativeFields, ...built.fields],
        built.groups,
      ),
      name: payload.name,
      slug: deps.slugService.normalize(payload.name),
      description: descriptor.description,
      type: E_TABLE_TYPE.TABLE,
      logo: null,
      fields: [...nativeFieldIds, ...built.fields.map((field) => field._id)],
      style: descriptor.style,
      owner: payload.ownerId,
      fieldOrderList: [...nativeFieldIds, ...built.orderList],
      fieldOrderForm: [...nativeFieldIds, ...built.orderForm],
      fieldOrderFilter: [...nativeFieldIds, ...built.orderFilter],
      fieldOrderDetail: [...nativeFieldIds, ...built.orderDetail],
      methods: {
        onLoad: { code: null },
        beforeSave: { code: descriptor.beforeSave },
        afterSave: { code: null },
      },
    };

    const table = await deps.tableRepository.create(createPayload);

    await descriptor.seed?.({
      table,
      fields: built.fields,
      payload,
      deps,
    });

    return right({ table, fieldIdMap: {} });
  }
}
