import { E_FIELD_VALIDATION } from '@application/core/entity.core';
import { CNPJ_REGEX } from '@application/core/field-rules.core';

import { StringFormatRule } from '../string-format.rule';

class IsCnpjRule extends StringFormatRule {
  readonly key = E_FIELD_VALIDATION.IS_CNPJ;
  readonly label = 'É CNPJ';

  protected readonly regex = CNPJ_REGEX;
  protected readonly message =
    'Formato de CNPJ inválido. Use XX.XXX.XXX/XXXX-XX';
}

export default new IsCnpjRule();
