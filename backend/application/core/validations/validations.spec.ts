import { describe, expect, it } from 'vitest';

import { E_FIELD_TYPE, E_FIELD_VALIDATION } from '../entity.core';
import type { IField } from '../entity.core';

import { getValidationRule } from './registry';
import type { ValidationContext, ValidationDeps } from './rule.contract';

// Deps inertes: regras puras nunca devem tocar no banco.
const inertDeps: ValidationDeps = {
  countFieldValue: async () => 0,
  userExistsByEmail: async () => false,
  userExistsByIdOrEmail: async () => false,
};

function makeContext(overrides: Partial<IField> = {}): ValidationContext {
  // Mock parcial de IField: as specs de regras puras só tocam slug/type/
  // multiple/validations. Construir o IField completo aqui seria ruído.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const field = {
    slug: 'campo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    multiple: false,
    validations: [],
    ...overrides,
  } as IField;

  return {
    field,
    payload: {},
    currentRowId: null,
    deps: inertDeps,
  };
}

describe('Field validation rules (puras)', () => {
  it('NOT_EMPTY falha em vazio e passa com texto', async () => {
    const rule = getValidationRule(E_FIELD_VALIDATION.NOT_EMPTY)!;
    expect(await rule.validate('', {}, makeContext())).toBeTruthy();
    expect(await rule.validate('   ', {}, makeContext())).toBeTruthy();
    expect(await rule.validate('abc', {}, makeContext())).toBeNull();
  });

  it('IS_EMAIL valida formato e ignora vazio', async () => {
    const rule = getValidationRule(E_FIELD_VALIDATION.IS_EMAIL)!;
    expect(await rule.validate('foo@bar.com', {}, makeContext())).toBeNull();
    expect(await rule.validate('invalido', {}, makeContext())).toBeTruthy();
    expect(await rule.validate('', {}, makeContext())).toBeNull();
  });

  it('IS_NUMERIC aceita numero, rejeita texto', async () => {
    const rule = getValidationRule(E_FIELD_VALIDATION.IS_NUMERIC)!;
    expect(await rule.validate('42', {}, makeContext())).toBeNull();
    expect(await rule.validate('-3.14', {}, makeContext())).toBeNull();
    expect(await rule.validate('abc', {}, makeContext())).toBeTruthy();
  });

  it('IS_ALPHA_NUMERIC rejeita simbolos', async () => {
    const rule = getValidationRule(E_FIELD_VALIDATION.IS_ALPHA_NUMERIC)!;
    expect(await rule.validate('abc123', {}, makeContext())).toBeNull();
    expect(await rule.validate('abc-123', {}, makeContext())).toBeTruthy();
  });

  it('IS_IN_RANGE respeita min/max', async () => {
    const rule = getValidationRule(E_FIELD_VALIDATION.IS_IN_RANGE)!;
    expect(
      await rule.validate('5', { min: 1, max: 10 }, makeContext()),
    ).toBeNull();
    expect(
      await rule.validate('0', { min: 1, max: 10 }, makeContext()),
    ).toBeTruthy();
    expect(
      await rule.validate('11', { min: 1, max: 10 }, makeContext()),
    ).toBeTruthy();
    // config como string tambem coerce
    expect(await rule.validate('5', { min: '1' }, makeContext())).toBeNull();
    expect(await rule.validate('abc', { min: 1 }, makeContext())).toBeTruthy();
  });

  it('IS_NOT bloqueia valores proibidos', async () => {
    const rule = getValidationRule(E_FIELD_VALIDATION.IS_NOT)!;
    const config = { values: ['admin', 'root'] };
    expect(await rule.validate('admin', config, makeContext())).toBeTruthy();
    expect(await rule.validate('joao', config, makeContext())).toBeNull();
  });

  it('IS_IBAN valida via mod-97', async () => {
    const rule = getValidationRule(E_FIELD_VALIDATION.IS_IBAN)!;
    // IBAN valido (exemplo padrao DE)
    expect(
      await rule.validate('DE89370400440532013000', {}, makeContext()),
    ).toBeNull();
    expect(
      await rule.validate('DE00000000000000000000', {}, makeContext()),
    ).toBeTruthy();
    expect(await rule.validate('invalido', {}, makeContext())).toBeTruthy();
  });

  it('IS_CPF / IS_CNPJ / IS_URL / IS_PHONE validam formato', async () => {
    const cpf = getValidationRule(E_FIELD_VALIDATION.IS_CPF)!;
    expect(await cpf.validate('123.456.789-00', {}, makeContext())).toBeNull();
    expect(await cpf.validate('12345678900', {}, makeContext())).toBeTruthy();

    const url = getValidationRule(E_FIELD_VALIDATION.IS_URL)!;
    expect(await url.validate('https://x.com', {}, makeContext())).toBeNull();
    expect(await url.validate('x.com', {}, makeContext())).toBeTruthy();
  });

  it('appliesTo filtra por tipo de campo', () => {
    const isEmail = getValidationRule(E_FIELD_VALIDATION.IS_EMAIL)!;
    expect(
      isEmail.appliesTo({
        type: E_FIELD_TYPE.TEXT_SHORT,
        format: null,
        multiple: false,
      }),
    ).toBe(true);
    expect(
      isEmail.appliesTo({
        type: E_FIELD_TYPE.DATE,
        format: null,
        multiple: false,
      }),
    ).toBe(false);
  });
});
