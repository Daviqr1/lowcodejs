import type { FastifyReply, FastifyRequest } from 'fastify';
import { Controller, GET, PUT, getInstanceByToken } from 'fastify-decorators';

import {
  E_EXTENSION_TYPE,
  E_FIELD_TYPE,
  E_TABLE_PERMISSION,
  type IField,
  type ITable,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';
import { AuthenticationMiddleware } from '@application/middlewares/authentication.middleware';
import { ExtensionActiveMiddleware } from '@application/middlewares/extension-active.middleware';
import { TableAccessMiddleware } from '@application/middlewares/table-access.middleware';

import ConditionalFieldsConfigMongooseRepository from './conditional-fields-config.repository';
import {
  GetConditionalFieldsConfigSchema,
  GetConditionalFieldsRuntimeConfigSchema,
  UpdateConditionalFieldsConfigSchema,
} from './conditional-fields.schema';
import type { ConditionalFieldRule } from './conditional-fields.types';
import { UpdateConditionalFieldsConfigValidator } from './conditional-fields.validator';

const EXTENSION_GUARD = ExtensionActiveMiddleware({
  pkg: 'forms',
  type: E_EXTENSION_TYPE.PLUGIN,
  extensionId: 'conditional-fields',
});

type RequestWithTable = FastifyRequest<{
  Params: { slug: string };
}>;

function flattenFields(table: ITable): IField[] {
  const topLevel = table.fields ?? [];
  const groupFields =
    table.groups?.flatMap((group) => group.fields ?? []) ?? [];
  return [...topLevel, ...groupFields];
}

function getRuleFieldSet(table: ITable): Map<string, IField> {
  const entries = flattenFields(table)
    .filter((field) => !field.trashed && !field.native)
    .map((field) => [field._id.toString(), field] as const);

  return new Map(entries);
}

function getConditionOptions(field: IField): string[] {
  if (field.type === E_FIELD_TYPE.DROPDOWN) {
    return (field.dropdown ?? []).map((option) => option.id);
  }

  if (field.type === E_FIELD_TYPE.CATEGORY) {
    const result: string[] = [];
    const walk = (items: IField['category']): void => {
      for (const item of items ?? []) {
        result.push(item.id);
        walk(item.children);
      }
    };
    walk(field.category ?? []);
    return result;
  }

  return [];
}

function assertRuleIsValid(
  rule: ConditionalFieldRule,
  fieldMap: Map<string, IField>,
): void {
  const sourceField = fieldMap.get(rule.sourceFieldId);

  if (!sourceField) {
    throw HTTPException.BadRequest(
      'Campo controlador não encontrado',
      'CONDITIONAL_FIELD_SOURCE_NOT_FOUND',
      { sourceFieldId: 'Campo controlador não encontrado' },
    );
  }

  if (sourceField.slug !== rule.sourceFieldSlug) {
    throw HTTPException.BadRequest(
      'Campo controlador inválido',
      'CONDITIONAL_FIELD_SOURCE_MISMATCH',
      { sourceFieldSlug: 'Slug do campo controlador inválido' },
    );
  }

  const conditionOptions = getConditionOptions(sourceField);
  if (!conditionOptions.includes(rule.sourceValue)) {
    throw HTTPException.BadRequest(
      'Valor da condição não encontrado no campo controlador',
      'CONDITIONAL_FIELD_SOURCE_VALUE_NOT_FOUND',
      { sourceValue: 'Valor da condição não encontrado' },
    );
  }

  const targetIds = [...rule.showFieldIds, ...rule.hideFieldIds];
  const sourceFieldAsTarget = targetIds.includes(rule.sourceFieldId);

  if (sourceFieldAsTarget) {
    throw HTTPException.BadRequest(
      'O campo controlador não pode ser afetado pela própria regra',
      'CONDITIONAL_FIELD_SOURCE_AS_TARGET',
      { sourceFieldId: 'Campo controlador não pode ser campo alvo' },
    );
  }

  const invalidTarget = targetIds.find((fieldId) => !fieldMap.has(fieldId));

  if (invalidTarget) {
    throw HTTPException.BadRequest(
      'Campo alvo não encontrado',
      'CONDITIONAL_FIELD_TARGET_NOT_FOUND',
      { targetFieldId: invalidTarget },
    );
  }
}

function assertRulesHaveNoConflicts(rules: ConditionalFieldRule[]): void {
  for (const rule of rules) {
    const sameRuleConflict = rule.showFieldIds.find((fieldId) =>
      rule.hideFieldIds.includes(fieldId),
    );

    if (sameRuleConflict) {
      throw HTTPException.BadRequest(
        'Uma regra não pode mostrar e ocultar o mesmo campo',
        'CONDITIONAL_FIELD_RULE_CONFLICT',
        { targetFieldId: sameRuleConflict },
      );
    }
  }
}

@Controller({ route: '/plugins/conditional-fields' })
export default class ConditionalFieldsController {
  @GET({
    url: '/tables/:slug/runtime',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: true }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.CREATE_ROW,
        }),
        EXTENSION_GUARD,
      ],
      schema: GetConditionalFieldsRuntimeConfigSchema,
    },
  })
  async getRuntimeConfig(
    request: RequestWithTable,
    response: FastifyReply,
  ): Promise<void> {
    const table = request.table!;
    const config = await getInstanceByToken(
      ConditionalFieldsConfigMongooseRepository,
    ).findByTable(table._id.toString(), table.slug);

    return response.status(200).send(config);
  }

  @GET({
    url: '/tables/:slug/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_TABLE,
        }),
        EXTENSION_GUARD,
      ],
      schema: GetConditionalFieldsConfigSchema,
    },
  })
  async getConfig(
    request: RequestWithTable,
    response: FastifyReply,
  ): Promise<void> {
    const table = request.table!;
    const config = await getInstanceByToken(
      ConditionalFieldsConfigMongooseRepository,
    ).findByTable(table._id.toString(), table.slug);

    return response.status(200).send(config);
  }

  @PUT({
    url: '/tables/:slug/config',
    options: {
      onRequest: [
        AuthenticationMiddleware({ optional: false }),
        TableAccessMiddleware({
          requiredPermission: E_TABLE_PERMISSION.UPDATE_TABLE,
        }),
        EXTENSION_GUARD,
      ],
      schema: UpdateConditionalFieldsConfigSchema,
    },
  })
  async updateConfig(
    request: RequestWithTable,
    response: FastifyReply,
  ): Promise<void> {
    const table = request.table!;
    const body = UpdateConditionalFieldsConfigValidator.parse(request.body);
    const fieldMap = getRuleFieldSet(table);

    for (const rule of body.rules) {
      assertRuleIsValid(rule, fieldMap);
    }
    assertRulesHaveNoConflicts(body.rules);

    const config = await getInstanceByToken(
      ConditionalFieldsConfigMongooseRepository,
    ).save({
      tableId: table._id.toString(),
      tableSlug: table.slug,
      rules: body.rules,
    });

    return response.status(200).send(config);
  }
}
