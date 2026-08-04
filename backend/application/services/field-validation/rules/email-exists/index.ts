import {
  E_FIELD_TYPE,
  E_FIELD_VALIDATION,
} from '@application/core/entity.core';

import type {
  ValidationContext,
  ValidationFieldShape,
} from '../../field-validation-rule-contract.service';
import { FieldValidationRule } from '../../field-validation-rule-contract.service';

// "E-mail existe": o e-mail digitado deve pertencer a um usuario cadastrado.
class EmailExistsRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.EMAIL_EXISTS;
  readonly label = 'E-mail existe';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return field.type === E_FIELD_TYPE.TEXT_SHORT;
  }

  async validate(
    value: unknown,
    config: Record<string, unknown>,
    context: ValidationContext,
  ): Promise<string | null> {
    if (this.isEmpty(value)) return null;
    if (typeof value !== 'string') return null;

    const exists = await context.deps.userExistsByEmail(value);
    if (!exists) return 'Nenhum usuário encontrado com este e-mail';
    return null;
  }
}

export default new EmailExistsRule();
