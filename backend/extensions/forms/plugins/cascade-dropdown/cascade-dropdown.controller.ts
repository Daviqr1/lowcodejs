/* eslint-disable no-unused-vars */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, PUT, getInstanceByToken } from 'fastify-decorators';
import mongoose from 'mongoose';

import {
  E_EXTENSION_TYPE,
  E_FIELD_TYPE,
  E_TABLE_PERMISSION,
  type IField,
  type IRow,
  type ITable,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';
import { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import TableMongooseRepository from '@application/repositories/table/table.repository';
import MongooseModelBuilder, {
  type Entity,
} from '@application/services/table/model-builder.service';
import MongooseQueryBuilder from '@application/services/table/query-builder.service';

import {
  findCascadeDropdownConfig,
  saveCascadeDropdownConfig,
} from './cascade-dropdown-config.model';
import {
  CascadeDropdownChildOptionsSchema,
  CascadeDropdownGetConfigSchema,
  CascadeDropdownParentOptionsSchema,
  CascadeDropdownSaveConfigSchema,
} from './cascade-dropdown.schema';
import type {
  CascadeDropdownConfig,
  CascadeDropdownFilter,
  CascadeDropdownOption,
} from './cascade-dropdown.types';
import {
  CascadeDropdownChildOptionsQueryValidator,
  CascadeDropdownConfigBodyValidator,
  CascadeDropdownOptionsParamsValidator,
  CascadeDropdownParamsValidator,
  CascadeDropdownParentOptionsQueryValidator,
} from './cascade-dropdown.validator';

const EXTENSION_GUARD = ExtensionActiveMiddleware({
  pkg: 'forms',
  type: E_EXTENSION_TYPE.PLUGIN,
  extensionId: 'cascade-dropdown',
});

const SELECTABLE_PARENT_TYPES = new Set<string>([E_FIELD_TYPE.RELATIONSHIP]);

const FILTERABLE_TYPES = new Set<string>([
  E_FIELD_TYPE.TEXT_SHORT,
  E_FIELD_TYPE.TEXT_LONG,
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.CATEGORY,
  E_FIELD_TYPE.RELATIONSHIP,
  E_FIELD_TYPE.USER,
  E_FIELD_TYPE.DATE,
]);

function sendError(response: FastifyReply, error: HTTPException): void {
  response.status(error.code).send({
    message: error.message,
    code: error.code,
    cause: error.cause,
    ...(error.errors && { errors: error.errors }),
  });
}

function fieldId(field: IField): string {
  return String(field._id);
}

function findFieldByIdOrSlug(
  fields: IField[],
  id: string,
  slug: string,
): IField | undefined {
  return fields.find((field) => fieldId(field) === id || field.slug === slug);
}

function compactString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function getConfiguredOptionLabel(field: IField, value: string): string {
  if (field.type === E_FIELD_TYPE.DROPDOWN) {
    return field.dropdown?.find((item) => item.id === value)?.label ?? value;
  }

  if (field.type === E_FIELD_TYPE.CATEGORY) {
    const stack = [...(field.category ?? [])];
    while (stack.length > 0) {
      const item = stack.shift();
      if (!item) continue;
      if (item.id === value) return item.label;
      stack.push(...((item.children ?? []) as typeof stack));
    }
  }

  return value;
}

async function getRelationshipOptionLabels(
  tableRepository: TableContractRepository,
  field: IField,
  values: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const relationshipTableSlug = field.relationship?.table?.slug;
  const relationshipFieldSlug = field.relationship?.field?.slug;

  if (!relationshipTableSlug || !relationshipFieldSlug || values.length === 0) {
    return labels;
  }

  const relationshipTable = await tableRepository.findBySlug(
    relationshipTableSlug,
  );
  if (!relationshipTable) return labels;

  const model = await getModel(relationshipTable);
  const rows = await model.find({ _id: { $in: values } });
  const data = await transformRows(rows);

  for (const row of data) {
    labels.set(String(row._id), compactString(row[relationshipFieldSlug]));
  }

  return labels;
}

function getRowValue(row: Record<string, unknown>, fieldSlug: string): unknown {
  return row[fieldSlug];
}

function toValueArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => compactString(item)).filter(Boolean);
  }
  const compacted = compactString(value);
  if (compacted) return [compacted];
  return [];
}

function buildEmptyQuery(operator: 'is_empty' | 'is_not_empty'): object {
  const emptyValues = [null, '', []];
  if (operator === 'is_empty') {
    return { $in: emptyValues };
  }
  return { $nin: emptyValues };
}

function buildFieldCondition(
  field: IField,
  filter: Pick<
    CascadeDropdownFilter,
    'operator' | 'value' | 'values' | 'dateStart' | 'dateEnd'
  >,
): unknown {
  let values: string[] = [];
  if (filter.values.length > 0) values = filter.values;
  if (filter.value) values.push(filter.value);

  if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
    return buildEmptyQuery(filter.operator);
  }

  if (
    (field.type === E_FIELD_TYPE.TEXT_SHORT ||
      field.type === E_FIELD_TYPE.TEXT_LONG) &&
    filter.operator === 'contains'
  ) {
    return {
      $regex: getInstanceByToken(MongooseQueryBuilder).normalize(
        filter.value ?? '',
      ),
      $options: 'i',
    };
  }

  if (filter.operator === 'date_between') {
    const range: { $gte?: Date; $lte?: Date } = {};
    if (filter.dateStart) {
      const start = new Date(filter.dateStart);
      range.$gte = new Date(start.setUTCHours(0, 0, 0, 0));
    }
    if (filter.dateEnd) {
      const end = new Date(filter.dateEnd);
      range.$lte = new Date(end.setUTCHours(23, 59, 59, 999));
    }
    return range;
  }

  if (
    field.type === E_FIELD_TYPE.DROPDOWN ||
    field.type === E_FIELD_TYPE.CATEGORY ||
    field.type === E_FIELD_TYPE.RELATIONSHIP ||
    field.type === E_FIELD_TYPE.USER
  ) {
    if (filter.operator === 'not_equals') return { $nin: values };
    return { $in: values };
  }

  if (filter.operator === 'not_equals') return { $ne: filter.value };
  return filter.value;
}

function buildQueryFromConfig(
  table: ITable,
  config: CascadeDropdownConfig,
  options?: {
    parentValue?: string;
    search?: string;
    childField?: IField;
  },
): Record<string, unknown> {
  const query: Record<string, unknown> = { trashed: { $ne: true } };
  const fields = table.fields ?? [];

  for (const filter of config.filters ?? []) {
    const field = findFieldByIdOrSlug(fields, filter.fieldId, filter.fieldSlug);
    if (!field || field.trashed) continue;
    query[field.slug] = buildFieldCondition(field, filter);
  }

  if (options?.parentValue) {
    const filterField = findFieldByIdOrSlug(
      fields,
      config.childFieldId,
      config.childFieldSlug,
    );
    if (filterField) {
      if (
        filterField.type === E_FIELD_TYPE.DROPDOWN ||
        filterField.type === E_FIELD_TYPE.CATEGORY ||
        filterField.type === E_FIELD_TYPE.RELATIONSHIP ||
        filterField.type === E_FIELD_TYPE.USER
      ) {
        query[filterField.slug] = { $in: [options.parentValue] };
      } else {
        query[filterField.slug] = options.parentValue;
      }
    }
  }

  if (
    options?.search &&
    options.childField &&
    (options.childField.type === E_FIELD_TYPE.TEXT_SHORT ||
      options.childField.type === E_FIELD_TYPE.TEXT_LONG)
  ) {
    query[options.childField.slug] = {
      $regex: getInstanceByToken(MongooseQueryBuilder).normalize(
        options.search,
      ),
      $options: 'i',
    };
  }

  return query;
}

async function getModel(table: ITable): Promise<mongoose.Model<Entity>> {
  return getInstanceByToken(MongooseModelBuilder).build(table);
}

async function transformRows(
  rows: Array<{ toJSON(opts: { flattenObjectIds: boolean }): IRow }>,
): Promise<IRow[]> {
  return rows.map((row) => row.toJSON({ flattenObjectIds: true }));
}

@Controller({ route: '/plugins/cascade-dropdown' })
export default class CascadeDropdownController {
  constructor(
    private readonly tableRepository: TableContractRepository = getInstanceByToken(
      TableMongooseRepository,
    ),
  ) {}

  private async validateConfig(
    targetTableSlug: string,
    targetFieldId: string,
    body: Omit<
      CascadeDropdownConfig,
      'targetTableSlug' | 'targetFieldId' | 'targetFieldSlug'
    >,
  ): Promise<{ config: CascadeDropdownConfig } | { error: HTTPException }> {
    const targetTable = await this.tableRepository.findBySlug(targetTableSlug);
    if (!targetTable) {
      return {
        error: HTTPException.NotFound(
          'Tabela não encontrada',
          'TABLE_NOT_FOUND',
        ),
      };
    }

    const targetField = targetTable.fields.find(
      (field) => fieldId(field) === targetFieldId,
    );
    if (!targetField || targetField.trashed) {
      return {
        error: HTTPException.NotFound(
          'Campo não encontrado',
          'FIELD_NOT_FOUND',
        ),
      };
    }

    if (targetField.type !== E_FIELD_TYPE.RELATIONSHIP) {
      return {
        error: HTTPException.BadRequest(
          'O campo precisa ser do tipo relacionamento',
          'FIELD_MUST_BE_RELATIONSHIP',
        ),
      };
    }

    if (!targetField.relationship?.table?.slug) {
      return {
        error: HTTPException.BadRequest(
          'Relacionamento não configurado',
          'RELATIONSHIP_NOT_CONFIGURED',
        ),
      };
    }

    if (targetField.relationship.table.slug !== body.sourceTableSlug) {
      return {
        error: HTTPException.BadRequest(
          'A tabela fonte deve ser a tabela relacionada ao campo',
          'SOURCE_TABLE_MISMATCH',
        ),
      };
    }

    const sourceTable = await this.tableRepository.findBySlug(
      body.sourceTableSlug,
    );
    if (!sourceTable) {
      return {
        error: HTTPException.NotFound(
          'Tabela fonte não encontrada',
          'SOURCE_TABLE_NOT_FOUND',
        ),
      };
    }

    const parentField = findFieldByIdOrSlug(
      targetTable.fields,
      body.parentFieldId,
      body.parentFieldSlug,
    );
    const childField = findFieldByIdOrSlug(
      sourceTable.fields,
      body.childFieldId,
      body.childFieldSlug,
    );

    if (!parentField || parentField.trashed || parentField.native) {
      return {
        error: HTTPException.BadRequest(
          'Campo pai inválido',
          'INVALID_PARENT_FIELD',
        ),
      };
    }

    if (!SELECTABLE_PARENT_TYPES.has(parentField.type)) {
      return {
        error: HTTPException.BadRequest(
          'Campo pai deve ser um relacionamento',
          'UNSUPPORTED_PARENT_FIELD_TYPE',
        ),
      };
    }

    if (!childField || childField.trashed || childField.native) {
      return {
        error: HTTPException.BadRequest(
          'Campo de filtro inválido',
          'INVALID_CHILD_FIELD',
        ),
      };
    }

    if (!SELECTABLE_PARENT_TYPES.has(childField.type)) {
      return {
        error: HTTPException.BadRequest(
          'Campo de filtro deve ser um relacionamento',
          'UNSUPPORTED_CHILD_FIELD_TYPE',
        ),
      };
    }

    const parentRelationshipTable = parentField.relationship?.table?.slug;
    const childRelationshipTable = childField.relationship?.table?.slug;
    if (
      parentRelationshipTable &&
      childRelationshipTable &&
      parentRelationshipTable !== childRelationshipTable
    ) {
      return {
        error: HTTPException.BadRequest(
          'O campo pai e o campo de filtro precisam apontar para a mesma tabela',
          'CASCADE_RELATIONSHIP_MISMATCH',
        ),
      };
    }

    for (const filter of body.filters) {
      const filterField = findFieldByIdOrSlug(
        sourceTable.fields,
        filter.fieldId,
        filter.fieldSlug,
      );

      if (!filterField || filterField.trashed || filterField.native) {
        return {
          error: HTTPException.BadRequest(
            'Filtro aponta para um campo inválido',
            'INVALID_FILTER_FIELD',
          ),
        };
      }

      if (!FILTERABLE_TYPES.has(filterField.type)) {
        return {
          error: HTTPException.BadRequest(
            'Tipo de campo não suportado para filtro',
            'UNSUPPORTED_FILTER_FIELD_TYPE',
          ),
        };
      }
    }

    return {
      config: {
        targetTableSlug,
        targetFieldId,
        targetFieldSlug: targetField.slug,
        sourceTableId: body.sourceTableId,
        sourceTableSlug: sourceTable.slug,
        parentFieldId: fieldId(parentField),
        parentFieldSlug: parentField.slug,
        childFieldId: fieldId(childField),
        childFieldSlug: childField.slug,
        enabled: body.enabled,
        parentWidth: body.parentWidth,
        childWidth: body.childWidth,
        filters: body.filters,
      },
    };
  }

  private async findUsableConfig(
    targetTableSlug: string,
    targetFieldId: string,
  ): Promise<CascadeDropdownConfig | null> {
    const config = await findCascadeDropdownConfig(
      targetTableSlug,
      targetFieldId,
    );
    if (!config) return null;

    const [targetTable, sourceTable] = await Promise.all([
      this.tableRepository.findBySlug(targetTableSlug),
      this.tableRepository.findBySlug(config.sourceTableSlug),
    ]);
    if (!targetTable || !sourceTable) return null;

    const targetField = findFieldByIdOrSlug(
      targetTable.fields,
      config.targetFieldId,
      config.targetFieldSlug,
    );
    const parentField = findFieldByIdOrSlug(
      targetTable.fields,
      config.parentFieldId,
      config.parentFieldSlug,
    );
    const childField = findFieldByIdOrSlug(
      sourceTable.fields,
      config.childFieldId,
      config.childFieldSlug,
    );

    if (!targetField || targetField.trashed || targetField.native) return null;
    if (!parentField || parentField.trashed || parentField.native) return null;
    if (!childField || childField.trashed || childField.native) return null;
    if (targetField.type !== E_FIELD_TYPE.RELATIONSHIP) return null;
    if (parentField.type !== E_FIELD_TYPE.RELATIONSHIP) return null;
    if (childField.type !== E_FIELD_TYPE.RELATIONSHIP) return null;
    if (targetField.relationship?.table?.slug !== config.sourceTableSlug) {
      return null;
    }

    const parentRelationshipTable = parentField.relationship?.table?.slug;
    const childRelationshipTable = childField.relationship?.table?.slug;
    if (
      !parentRelationshipTable ||
      !childRelationshipTable ||
      parentRelationshipTable !== childRelationshipTable
    ) {
      return null;
    }

    return config;
  }

  @GET({
    url: '/tables/:slug/fields/:fieldId/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_FIELD,
        }),
        EXTENSION_GUARD,
      ],
      schema: CascadeDropdownGetConfigSchema,
    },
  })
  async getConfig(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = CascadeDropdownParamsValidator.parse(request.params);
    const config = await this.findUsableConfig(params.slug, params.fieldId);

    return response.status(200).send(config);
  }

  @PUT({
    url: '/tables/:slug/fields/:fieldId/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_FIELD,
        }),
        EXTENSION_GUARD,
      ],
      schema: CascadeDropdownSaveConfigSchema,
    },
  })
  async saveConfig(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = CascadeDropdownParamsValidator.parse(request.params);
    const body = CascadeDropdownConfigBodyValidator.parse(request.body);

    const validation = await this.validateConfig(
      params.slug,
      params.fieldId,
      body,
    );

    if ('error' in validation) {
      return sendError(response, validation.error);
    }

    const saved = await saveCascadeDropdownConfig(validation.config);
    return response.status(200).send(saved);
  }

  @GET({
    url: '/source/:slug/target/:targetTableSlug/fields/:fieldId/parent-options',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
        EXTENSION_GUARD,
      ],
      schema: CascadeDropdownParentOptionsSchema,
    },
  })
  async parentOptions(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = CascadeDropdownOptionsParamsValidator.parse(request.params);
    const query = CascadeDropdownParentOptionsQueryValidator.parse(
      request.query,
    );

    const config = await this.findUsableConfig(
      params.targetTableSlug,
      params.fieldId,
    );
    if (!config || !config.enabled) return response.status(200).send([]);
    if (config.sourceTableSlug !== params.slug) {
      return sendError(
        response,
        HTTPException.BadRequest(
          'Tabela fonte incompatível',
          'SOURCE_TABLE_MISMATCH',
        ),
      );
    }

    const sourceTable = await this.tableRepository.findBySlug(params.slug);
    if (!sourceTable) {
      return sendError(
        response,
        HTTPException.NotFound(
          'Tabela fonte não encontrada',
          'SOURCE_TABLE_NOT_FOUND',
        ),
      );
    }

    const parentField = findFieldByIdOrSlug(
      sourceTable.fields,
      config.parentFieldId,
      config.parentFieldSlug,
    );
    if (!parentField) return response.status(200).send([]);

    const model = await getModel(sourceTable);
    const mongoQuery = buildQueryFromConfig(sourceTable, config);
    const rawValues = await model.distinct(parentField.slug, mongoQuery);

    const seen = new Set<string>();
    const options: CascadeDropdownOption[] = [];
    const values: string[] = [];

    for (const rawValue of rawValues) {
      for (const value of toValueArray(rawValue)) {
        if (seen.has(value)) continue;
        seen.add(value);
        values.push(value);
      }
    }

    const relationshipLabels =
      parentField.type === E_FIELD_TYPE.RELATIONSHIP
        ? await getRelationshipOptionLabels(
            this.tableRepository,
            parentField,
            values,
          )
        : new Map<string, string>();

    for (const value of values) {
      const label =
        relationshipLabels.get(value) ??
        getConfiguredOptionLabel(parentField, value);
      if (
        query.search &&
        !label.toLowerCase().includes(query.search.toLowerCase())
      ) {
        continue;
      }
      options.push({ value, label });
    }

    options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    return response.status(200).send(options);
  }

  @GET({
    url: '/source/:slug/target/:targetTableSlug/fields/:fieldId/child-options',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.VIEW_ROW,
        }),
        EXTENSION_GUARD,
      ],
      schema: CascadeDropdownChildOptionsSchema,
    },
  })
  async childOptions(
    request: FastifyRequest,
    response: FastifyReply,
  ): Promise<void> {
    const params = CascadeDropdownOptionsParamsValidator.parse(request.params);
    const query = CascadeDropdownChildOptionsQueryValidator.parse(
      request.query,
    );

    const config = await this.findUsableConfig(
      params.targetTableSlug,
      params.fieldId,
    );
    if (!config || !config.enabled) {
      return response.status(200).send({
        data: [],
        meta: {
          total: 0,
          perPage: query.perPage,
          page: query.page,
          lastPage: 0,
          firstPage: 0,
        },
      });
    }

    if (config.sourceTableSlug !== params.slug) {
      return sendError(
        response,
        HTTPException.BadRequest(
          'Tabela fonte incompatível',
          'SOURCE_TABLE_MISMATCH',
        ),
      );
    }

    const sourceTable = await this.tableRepository.findBySlug(params.slug);
    if (!sourceTable) {
      return sendError(
        response,
        HTTPException.NotFound(
          'Tabela fonte não encontrada',
          'SOURCE_TABLE_NOT_FOUND',
        ),
      );
    }

    const childField = findFieldByIdOrSlug(
      sourceTable.fields,
      config.childFieldId,
      config.childFieldSlug,
    );

    const model = await getModel(sourceTable);
    const mongoQuery = buildQueryFromConfig(sourceTable, config, {
      parentValue: query.parentValue,
      search: query.search,
      childField,
    });

    const skip = (query.page - 1) * query.perPage;
    const [rows, total] = await Promise.all([
      model
        .find(mongoQuery)
        .skip(skip)
        .limit(query.perPage)
        .sort({ [config.childFieldSlug]: 1 }),
      model.countDocuments(mongoQuery),
    ]);

    const data = await transformRows(rows);
    let lastPage = 0;
    if (total > 0) lastPage = Math.ceil(total / query.perPage);
    let firstPage = 0;
    if (total > 0) firstPage = 1;

    return response.status(200).send({
      data,
      meta: {
        total,
        perPage: query.perPage,
        page: query.page,
        lastPage,
        firstPage,
      },
    });
  }
}
