import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import { URL_REGEX } from '../../field-rules.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

class IsUrlRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_URL;
  readonly label = 'É URL';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (typeof value !== 'string') return null;
    if (!URL_REGEX.test(value)) return 'Formato de URL inválido';
    return null;
  }
}

export default new IsUrlRule();
