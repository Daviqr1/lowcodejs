import { E_FIELD_VALIDATION } from '@application/core/entity.core';
import { EMAIL_REGEX } from '@application/core/field-rules.core';

import { StringFormatRule } from '../string-format.rule';

class IsEmailRule extends StringFormatRule {
  readonly key = E_FIELD_VALIDATION.IS_EMAIL;
  readonly label = 'É e-mail';

  protected readonly regex = EMAIL_REGEX;
  protected readonly message = 'Formato de e-mail inválido';
}

export default new IsEmailRule();
