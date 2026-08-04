import { E_FIELD_VALIDATION } from '@application/core/entity.core';
import { CPF_REGEX } from '@application/core/field-rules.core';

import { StringFormatRule } from '../string-format.rule';

class IsCpfRule extends StringFormatRule {
  readonly key = E_FIELD_VALIDATION.IS_CPF;
  readonly label = 'É CPF';

  protected readonly regex = CPF_REGEX;
  protected readonly message = 'Formato de CPF inválido. Use XXX.XXX.XXX-XX';
}

export default new IsCpfRule();
