import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import { PHONE_REGEX } from '../../field-rules.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

class IsPhoneRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_PHONE;
  readonly label = 'É telefone';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (typeof value !== 'string') return null;
    if (!PHONE_REGEX.test(value))
      return 'Formato de telefone inválido. Use (XX) XXXXX-XXXX ou (XX) XXXX-XXXX';
    return null;
  }
}

export default new IsPhoneRule();
