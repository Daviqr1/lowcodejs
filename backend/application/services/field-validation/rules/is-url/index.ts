import { E_FIELD_VALIDATION } from '@application/core/entity.core';
import { URL_REGEX } from '@application/core/field-rules.core';

import { StringFormatRule } from '../string-format.rule';

class IsUrlRule extends StringFormatRule {
  readonly key = E_FIELD_VALIDATION.IS_URL;
  readonly label = 'É URL';

  protected readonly regex = URL_REGEX;
  protected readonly message = 'Formato de URL inválido';
}

export default new IsUrlRule();
