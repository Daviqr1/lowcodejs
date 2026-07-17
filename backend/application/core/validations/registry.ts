import type { ValueOf } from '../entity.core';
import { E_FIELD_VALIDATION } from '../entity.core';

import areUniqueValues from './are-unique-values';
import emailExists from './email-exists';
import isAlphaNumeric from './is-alpha-numeric';
import isCnpj from './is-cnpj';
import isCpf from './is-cpf';
import isEmail from './is-email';
import isIban from './is-iban';
import isInRange from './is-in-range';
import isNot from './is-not';
import isNumeric from './is-numeric';
import isPhone from './is-phone';
import isUnique from './is-unique';
import isUrl from './is-url';
import notEmpty from './not-empty';
import type { FieldValidationRule } from './rule.contract';
import userExists from './user-exists';

// Todas as regras de validacao de campo. Cada uma vive em
// `core/validations/<regra>/index.ts` e exporta uma instancia default.
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

export const VALIDATION_REGISTRY: ReadonlyMap<
  ValueOf<typeof E_FIELD_VALIDATION>,
  FieldValidationRule
> = new Map(RULES.map((rule) => [rule.key, rule]));

export function getValidationRule(
  key: ValueOf<typeof E_FIELD_VALIDATION>,
): FieldValidationRule | undefined {
  return VALIDATION_REGISTRY.get(key);
}
