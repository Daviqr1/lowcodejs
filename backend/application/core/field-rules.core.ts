export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/;

// Regexes puros de validacao de valor, agnosticos de banco. Sao a fonte unica
// reusada pelas regras de `core/validations/*` (camada unica de validacao) e
// espelhados no front. Antes viviam embutidos no `RowPayloadValidator` como
// `FORMAT_VALIDATORS`; migraram para ca quando `format` deixou de validar.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const URL_REGEX = /^https?:\/\/.+/;
export const PHONE_REGEX = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;
export const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
export const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
export const ALPHA_NUMERIC_REGEX = /^[a-zA-Z0-9]+$/;
export const INTEGER_REGEX = /^-?\d+$/;
export const DECIMAL_REGEX = /^-?\d+(\.\d+)?$/;
// Numero (inteiro ou decimal, com sinal). Reusado por IS_NUMERIC e IS_IN_RANGE.
export const NUMERIC_REGEX = /^-?\d+(\.\d+)?$/;
