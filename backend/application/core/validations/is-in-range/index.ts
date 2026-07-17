import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

// Coerce number | numeric-string → number; senao null.
function toNumber(input: unknown): number | null {
  if (typeof input === 'number' && !Number.isNaN(input)) return input;
  if (typeof input === 'string' && input.trim() !== '') {
    const parsed = Number(input);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

// "Maior ou menor que": valor numerico dentro de [min, max]. Ambos opcionais
// em config; pelo menos um deve estar setado para a regra ter efeito.
class IsInRangeRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_IN_RANGE;
  readonly label = 'Maior ou menor que';
  readonly requiresConfig = true;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(
    value: unknown,
    config: Record<string, unknown>,
  ): Promise<string | null> {
    if (isEmptyValue(value)) return null;

    const num = toNumber(value);
    if (num === null) return 'Deve ser um número';

    const min = toNumber(config.min);
    const max = toNumber(config.max);

    if (min !== null && num < min) return `Deve ser maior ou igual a ${min}`;
    if (max !== null && num > max) return `Deve ser menor ou igual a ${max}`;
    return null;
  }
}

export default new IsInRangeRule();
