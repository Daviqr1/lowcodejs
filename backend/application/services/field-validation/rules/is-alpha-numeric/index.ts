import { E_FIELD_VALIDATION } from '@application/core/entity.core';
import { ALPHA_NUMERIC_REGEX } from '@application/core/field-rules.core';

import { StringFormatRule } from '../string-format.rule';

class IsAlphaNumericRule extends StringFormatRule {
  readonly key = E_FIELD_VALIDATION.IS_ALPHA_NUMERIC;
  readonly label = 'É alfanumérico';

  protected readonly regex = ALPHA_NUMERIC_REGEX;
  protected readonly message = 'Deve conter apenas letras e números';
}

export default new IsAlphaNumericRule();
