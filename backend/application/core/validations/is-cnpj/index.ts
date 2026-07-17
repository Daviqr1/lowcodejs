import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import { CNPJ_REGEX } from '../../field-rules.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

class IsCnpjRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_CNPJ;
  readonly label = 'É CNPJ';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (typeof value !== 'string') return null;
    if (!CNPJ_REGEX.test(value))
      return 'Formato de CNPJ inválido. Use XX.XXX.XXX/XXXX-XX';
    return null;
  }
}

export default new IsCnpjRule();
