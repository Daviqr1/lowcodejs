import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

// "Diferente de": o valor nao pode ser nenhum dos `config.values`.
class IsNotRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_NOT;
  readonly label = 'Diferente de';
  readonly requiresConfig = true;

  appliesTo(field: ValidationFieldShape): boolean {
    return (
      field.type === E_FIELD_TYPE.TEXT_SHORT ||
      field.type === E_FIELD_TYPE.TEXT_LONG
    );
  }

  async validate(
    value: unknown,
    config: Record<string, unknown>,
  ): Promise<string | null> {
    if (isEmptyValue(value)) return null;

    let disallowed: unknown[] = [];
    if (Array.isArray(config.values)) disallowed = config.values;

    const current = String(value);
    if (disallowed.map((item) => String(item)).includes(current))
      return 'Valor não permitido';
    return null;
  }
}

export default new IsNotRule();
