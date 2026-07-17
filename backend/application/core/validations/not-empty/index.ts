import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

class NotEmptyRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.NOT_EMPTY;
  readonly label = 'Não vazio';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return (
      field.type === E_FIELD_TYPE.TEXT_SHORT ||
      field.type === E_FIELD_TYPE.TEXT_LONG
    );
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return 'Este campo não pode ser vazio';
    if (typeof value === 'string' && value.trim() === '')
      return 'Este campo não pode ser vazio';
    return null;
  }
}

export default new NotEmptyRule();
