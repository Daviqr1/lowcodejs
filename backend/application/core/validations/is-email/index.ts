import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import { EMAIL_REGEX } from '../../field-rules.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

class IsEmailRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_EMAIL;
  readonly label = 'É e-mail';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (typeof value !== 'string') return null;
    if (!EMAIL_REGEX.test(value)) return 'Formato de e-mail inválido';
    return null;
  }
}

export default new IsEmailRule();
