import { E_FIELD_VALIDATION } from '@application/core/entity.core';
import { PHONE_REGEX } from '@application/core/field-rules.core';

import { StringFormatRule } from '../string-format.rule';

class IsPhoneRule extends StringFormatRule {
  readonly key = E_FIELD_VALIDATION.IS_PHONE;
  readonly label = 'É telefone';

  protected readonly regex = PHONE_REGEX;
  protected readonly message =
    'Formato de telefone inválido. Use (XX) XXXXX-XXXX ou (XX) XXXX-XXXX';
}

export default new IsPhoneRule();
