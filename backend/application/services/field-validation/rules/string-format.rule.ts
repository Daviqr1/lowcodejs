import { E_FIELD_TYPE } from '@application/core/entity.core';

import type { ValidationFieldShape } from '../field-validation-rule.contract';
import { FieldValidationRule } from '../field-validation-rule.contract';

/**
 * Base das regras que so checam o formato de um TEXT_SHORT contra um regex.
 * Oito regras repetiam o mesmo prologo (`requiresConfig = false`, o mesmo
 * `appliesTo` e as duas guardas de valor vazio / nao-string); aqui elas
 * declaram apenas `key`, `label`, `regex` e `message`.
 */
export abstract class StringFormatRule extends FieldValidationRule {
  readonly requiresConfig = false;

  protected abstract readonly regex: RegExp;
  protected abstract readonly message: string;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(value: unknown): Promise<string | null> {
    if (this.isEmpty(value)) return null;
    if (typeof value !== 'string') return null;
    if (!this.regex.test(value)) return this.message;
    return null;
  }
}
