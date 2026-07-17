import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import { CPF_REGEX } from '../../field-rules.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

class IsCpfRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_CPF;
  readonly label = 'É CPF';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (typeof value !== 'string') return null;
    if (!CPF_REGEX.test(value))
      return 'Formato de CPF inválido. Use XXX.XXX.XXX-XX';
    return null;
  }
}

export default new IsCpfRule();
