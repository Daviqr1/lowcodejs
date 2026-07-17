import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import { ALPHA_NUMERIC_REGEX } from '../../field-rules.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

class IsAlphaNumericRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_ALPHA_NUMERIC;
  readonly label = 'É alfanumérico';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (typeof value !== 'string') return null;
    if (!ALPHA_NUMERIC_REGEX.test(value))
      return 'Deve conter apenas letras e números';
    return null;
  }
}

export default new IsAlphaNumericRule();
