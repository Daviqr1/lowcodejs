import { Service } from 'fastify-decorators';

import type { Either } from '@application/core/either.core';
import { left, right } from '@application/core/either.core';
import {
  E_FIELD_TYPE,
  type IField,
  type ITable,
} from '@application/core/entity.core';
import HTTPException from '@application/core/exception.core';

import { ConditionalFieldsConfigContractRepository } from './conditional-fields-config-contract.repository';
import type {
  ConditionalFieldRule,
  ConditionalFieldsConfig,
} from './conditional-fields.types';

type Payload = {
  table: ITable;
  rules: ConditionalFieldRule[];
};

type Response = Either<HTTPException, ConditionalFieldsConfig>;

@Service()
export default class UpdateConditionalFieldsConfigUseCase {
  constructor(
    private readonly configRepository: ConditionalFieldsConfigContractRepository,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    const fieldMap = this.buildRuleFieldMap(payload.table);

    for (const rule of payload.rules) {
      const invalid = this.validateRule(rule, fieldMap);
      if (invalid) return left(invalid);
    }

    const conflict = this.findConflict(payload.rules);
    if (conflict) return left(conflict);

    const config = await this.configRepository.save({
      tableId: payload.table._id.toString(),
      tableSlug: payload.table.slug,
      rules: payload.rules,
    });

    return right(config);
  }

  /** Campos elegiveis a regra: os da tabela e os dos grupos, sem nativo nem lixeira. */
  private buildRuleFieldMap(table: ITable): Map<string, IField> {
    const topLevel = table.fields ?? [];
    const groupFields =
      table.groups?.flatMap((group) => group.fields ?? []) ?? [];

    const entries = [...topLevel, ...groupFields]
      .filter((field) => !field.trashed && !field.native)
      .map((field) => [field._id.toString(), field] as const);

    return new Map(entries);
  }

  /** Valores que o campo controlador pode assumir numa condicao. */
  private conditionOptions(field: IField): string[] {
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

  /** `null` quando a regra e valida. */
  private validateRule(
    rule: ConditionalFieldRule,
    fieldMap: Map<string, IField>,
  ): HTTPException | null {
    const sourceField = fieldMap.get(rule.sourceFieldId);

    if (!sourceField) {
      return HTTPException.BadRequest(
        'Campo controlador não encontrado',
        'CONDITIONAL_FIELD_SOURCE_NOT_FOUND',
        { sourceFieldId: 'Campo controlador não encontrado' },
      );
    }

    if (sourceField.slug !== rule.sourceFieldSlug) {
      return HTTPException.BadRequest(
        'Campo controlador inválido',
        'CONDITIONAL_FIELD_SOURCE_MISMATCH',
        { sourceFieldSlug: 'Slug do campo controlador inválido' },
      );
    }

    if (!this.conditionOptions(sourceField).includes(rule.sourceValue)) {
      return HTTPException.BadRequest(
        'Valor da condição não encontrado no campo controlador',
        'CONDITIONAL_FIELD_SOURCE_VALUE_NOT_FOUND',
        { sourceValue: 'Valor da condição não encontrado' },
      );
    }

    const targetIds = [...rule.showFieldIds, ...rule.hideFieldIds];

    if (targetIds.includes(rule.sourceFieldId)) {
      return HTTPException.BadRequest(
        'O campo controlador não pode ser afetado pela própria regra',
        'CONDITIONAL_FIELD_SOURCE_AS_TARGET',
        { sourceFieldId: 'Campo controlador não pode ser campo alvo' },
      );
    }

    const invalidTarget = targetIds.find((fieldId) => !fieldMap.has(fieldId));

    if (invalidTarget) {
      return HTTPException.BadRequest(
        'Campo alvo não encontrado',
        'CONDITIONAL_FIELD_TARGET_NOT_FOUND',
        { targetFieldId: invalidTarget },
      );
    }

    return null;
  }

  /** Uma regra nao pode mostrar e ocultar o mesmo campo. */
  private findConflict(rules: ConditionalFieldRule[]): HTTPException | null {
    for (const rule of rules) {
      const conflict = rule.showFieldIds.find((fieldId) =>
        rule.hideFieldIds.includes(fieldId),
      );

      if (conflict) {
        return HTTPException.BadRequest(
          'Uma regra não pode mostrar e ocultar o mesmo campo',
          'CONDITIONAL_FIELD_RULE_CONFLICT',
          { targetFieldId: conflict },
        );
      }
    }

    return null;
  }
}
