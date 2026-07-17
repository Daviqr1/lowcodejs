import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../../entity.core';
import type { ValidationContext, ValidationFieldShape } from '../rule.contract';
import { FieldValidationRule, isEmptyValue } from '../rule.contract';

// "Usuário existe": o valor (id ou e-mail) deve corresponder a um usuario
// existente. Suporta campo USER (array de ids) e TEXT_SHORT (id/e-mail).
class UserExistsRule extends FieldValidationRule {
  readonly key = E_FIELD_VALIDATION.USER_EXISTS;
  readonly label = 'Usuário existe';
  readonly requiresConfig = false;

  appliesTo(field: ValidationFieldShape): boolean {
    return (
      field.type === E_FIELD_TYPE.TEXT_SHORT || field.type === E_FIELD_TYPE.USER
    );
  }

  async validate(
    value: unknown,
    config: Record<string, unknown>,
    context: ValidationContext,
  ): Promise<string | null> {
    if (isEmptyValue(value)) return null;

    const candidates: string[] = [];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item) candidates.push(item);
      }
    } else if (typeof value === 'string') {
      candidates.push(value);
    }

    for (const candidate of candidates) {
      const exists = await context.deps.userExistsByIdOrEmail(candidate);
      if (!exists) return 'Usuário não encontrado';
    }
    return null;
  }
}

export default new UserExistsRule();
