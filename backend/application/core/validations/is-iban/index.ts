import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import type { ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

// mod-97 sobre a string numerica expandida (ISO 7064). IBAN valido => 1.
function mod97(input: string): number {
  let remainder = 0;
  for (const char of input) {
    remainder = (remainder * 10 + Number(char)) % 97;
  }
  return remainder;
}

function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  if (iban.length < 15 || iban.length > 34) return false;

  // Move os 4 primeiros chars para o fim e expande letras (A=10 ... Z=35).
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let expanded = '';
  for (const char of rearranged) {
    if (char >= '0' && char <= '9') {
      expanded += char;
      continue;
    }
    expanded += String(char.charCodeAt(0) - 55);
  }

  return mod97(expanded) === 1;
}

class IsIbanRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.IS_IBAN;
  readonly label = 'É IBAN';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (isEmptyValue(value)) return null;
    if (typeof value !== 'string') return null;
    if (!isValidIban(value)) return 'IBAN inválido';
    return null;
  }
}

export default new IsIbanRule();
