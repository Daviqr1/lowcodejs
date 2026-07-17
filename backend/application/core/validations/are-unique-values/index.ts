import { E_FIELD_VALIDATION } from '../../entity.core';
import type { ValidationContext, ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

// "Valores únicos": campo multiplo cujos elementos devem ser unicos entre si E
// sem colidir com valores ja presentes na coluna (em outras rows).
class AreUniqueValuesRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.ARE_UNIQUE_VALUES;
  readonly label = 'Valores únicos';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.multiple;
  }

  async validate(
    value: unknown,
    config: Record<string, unknown>,
    context: ValidationContext,
  ): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (!Array.isArray(value)) return null;

    const seen = new Set<string>();
    for (const item of value) {
      const key = String(item);
      if (seen.has(key)) return 'Os valores devem ser únicos (há duplicados)';
      seen.add(key);
    }

    for (const item of value) {
      const count = await context.deps.countFieldValue(
        context.field.slug,
        item,
        context.currentRowId,
      );
      if (count > 0) return 'Um ou mais valores já existem nesta tabela';
    }
    return null;
  }
}

export default new AreUniqueValuesRule();
