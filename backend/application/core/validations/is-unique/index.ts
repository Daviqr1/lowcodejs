import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import type { ValidationContext, ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

// "Valor único": o valor digitado nao pode existir em nenhuma outra row da
// coluna da propria tabela. No update, ignora a propria row (`currentRowId`).
class IsUniqueRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_UNIQUE;
  readonly label = 'Valor único';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT && !field.multiple;
  }

  async validate(
    value: unknown,
    config: Record<string, unknown>,
    context: ValidationContext,
  ): Promise<string | null> {
    if (isEmptyValue(value)) return null;

    const count = await context.deps.countFieldValue(
      context.field.slug,
      value,
      context.currentRowId,
    );
    if (count > 0) return 'Este valor já existe nesta tabela';
    return null;
  }
}

export default new IsUniqueRule();
