import { E_FIELD_VALIDATION } from '@application/core/entity.core';
import { NUMERIC_REGEX } from '@application/core/field-rules.core';

import { StringFormatRule } from '../string-format.rule';

class IsNumericRule extends StringFormatRule {
  readonly key = E_FIELD_VALIDATION.IS_NUMERIC;
  readonly label = 'É numérico';

  protected readonly regex = NUMERIC_REGEX;
  protected readonly message = 'Deve ser um número';
}

export default new IsNumericRule();
