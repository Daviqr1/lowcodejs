import { Service } from 'fastify-decorators';

import type { FieldValidationRule } from './field-validation-rule.contract';
import type { ValidationRuleKey } from './rule-registry-contract.service';
import { FieldValidationRuleRegistryContractService } from './rule-registry-contract.service';
import areUniqueValues from './rules/are-unique-values';
import emailExists from './rules/email-exists';
import isAlphaNumeric from './rules/is-alpha-numeric';
import isCnpj from './rules/is-cnpj';
import isCpf from './rules/is-cpf';
import isEmail from './rules/is-email';
import isIban from './rules/is-iban';
import isInRange from './rules/is-in-range';
import isNot from './rules/is-not';
import isNumeric from './rules/is-numeric';
import isPhone from './rules/is-phone';
import isUnique from './rules/is-unique';
import isUrl from './rules/is-url';
import notEmpty from './rules/not-empty';
import userExists from './rules/user-exists';

// Regra nova: crie `rules/<regra>/index.ts` e acrescente aqui.
const RULES: FieldValidationRule[] = [
  notEmpty,
  isEmail,
  isNumeric,
  isAlphaNumeric,
  isInRange,
  isIban,
  isNot,
  isUrl,
  isPhone,
  isCpf,
  isCnpj,
  isUnique,
  areUniqueValues,
  emailExists,
  userExists,
];

@Service()
export default class FieldValidationRuleRegistryService implements FieldValidationRuleRegistryContractService {
  private readonly byKey: ReadonlyMap<ValidationRuleKey, FieldValidationRule> =
    new Map(RULES.map((rule) => [rule.key, rule]));

  get(key: ValidationRuleKey): FieldValidationRule | undefined {
    return this.byKey.get(key);
  }

  list(): FieldValidationRule[] {
    return [...RULES];
  }
}
