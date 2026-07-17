import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import { NUMERIC_REGEX } from '../../field-rules.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

class IsNumericRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_NUMERIC;
  readonly label = 'É numérico';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (typeof value !== 'string') return null;
    if (!NUMERIC_REGEX.test(value)) return 'Deve ser um número';
    return null;
  }
}

export default new IsNumericRule();
