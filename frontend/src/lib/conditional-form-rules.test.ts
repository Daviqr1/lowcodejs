import { describe, expect, it } from 'vitest';

import {
  findConditionalRuleConflicts,
  omitHiddenConditionalValues,
  resolveConditionalVisibility,
} from './conditional-form-rules';
import type { ConditionalFieldRule } from './conditional-form-rules';
import type { IField } from './interfaces';

function field(id: string, slug: string): IField {
  // fixture de teste: só as propriedades usadas são preenchidas.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    _id: id,
    name: slug,
    slug,
  } as IField;
}

function rule(
  id: string,
  sourceFieldId: string,
  sourceFieldSlug: string,
  sourceValue: string,
  targets: Pick<ConditionalFieldRule, 'showFieldIds' | 'hideFieldIds'>,
): ConditionalFieldRule {
  return {
    id,
    sourceFieldId,
    sourceFieldSlug,
    sourceValue,
    showFieldIds: targets.showFieldIds,
    hideFieldIds: targets.hideFieldIds,
  };
}

describe('conditional form rules', () => {
  const fields = [
    field('type', 'tipo_cliente'),
    field('cpf', 'cpf'),
    field('birthDate', 'data_nascimento'),
    field('cnpj', 'cnpj'),
    field('companyMembers', 'socios'),
  ];

  it('hides conditional fields until a matching rule shows them', () => {
    const rules = [
      rule('individual', 'type', 'tipo_cliente', 'pf', {
        showFieldIds: ['cpf', 'birthDate'],
        hideFieldIds: ['cnpj', 'companyMembers'],
      }),
      rule('company', 'type', 'tipo_cliente', 'pj', {
        showFieldIds: ['cnpj', 'companyMembers'],
        hideFieldIds: ['cpf', 'birthDate'],
      }),
    ];

    const emptyVisibility = resolveConditionalVisibility(fields, rules, {});
    expect(emptyVisibility.visibleFields.map((item) => item._id)).toEqual([
      'type',
    ]);

    const individualVisibility = resolveConditionalVisibility(fields, rules, {
      tipo_cliente: 'pf',
    });
    expect(individualVisibility.visibleFields.map((item) => item._id)).toEqual([
      'type',
      'cpf',
      'birthDate',
    ]);
  });

  it('keeps conditional fields hidden when the controller value is empty', () => {
    const rules = [
      rule('individual', 'type', 'tipo_cliente', 'cpf', {
        showFieldIds: ['cpf', 'birthDate'],
        hideFieldIds: [],
      }),
      rule('company', 'type', 'tipo_cliente', 'cnpj', {
        showFieldIds: ['cnpj', 'companyMembers'],
        hideFieldIds: [],
      }),
    ];

    const emptyValues = [
      {},
      { tipo_cliente: '' },
      { tipo_cliente: null },
      { tipo_cliente: [] },
      { tipo_cliente: {} },
    ];

    for (const values of emptyValues) {
      const visibility = resolveConditionalVisibility(fields, rules, values);

      expect(visibility.visibleFields.map((item) => item._id)).toEqual([
        'type',
      ]);
    }
  });

  it('removes hidden conditional values from the submitted payload', () => {
    const visibility = resolveConditionalVisibility(
      fields,
      [
        rule('individual', 'type', 'tipo_cliente', 'pf', {
          showFieldIds: ['cpf'],
          hideFieldIds: ['cnpj'],
        }),
      ],
      { tipo_cliente: 'pf' },
    );

    expect(
      omitHiddenConditionalValues(
        {
          tipo_cliente: 'pf',
          cpf: '123',
          cnpj: '456',
        },
        fields,
        visibility.hiddenFieldIds,
      ),
    ).toEqual({
      tipo_cliente: 'pf',
      cpf: '123',
    });
  });

  it('allows alternative values from the same controller field', () => {
    const conflicts = findConditionalRuleConflicts([
      rule('individual', 'type', 'tipo_cliente', 'pf', {
        showFieldIds: ['cpf'],
        hideFieldIds: ['cnpj'],
      }),
      rule('company', 'type', 'tipo_cliente', 'pj', {
        showFieldIds: ['cnpj'],
        hideFieldIds: ['cpf'],
      }),
    ]);

    expect(conflicts).toEqual([]);
  });

  it('allows overlaps between different rules because order defines priority', () => {
    const conflicts = findConditionalRuleConflicts([
      rule('type-company', 'type', 'tipo_cliente', 'pj', {
        showFieldIds: ['cnpj'],
        hideFieldIds: [],
      }),
      rule('status-active', 'status', 'status_cliente', 'active', {
        showFieldIds: [],
        hideFieldIds: ['cnpj'],
      }),
    ]);

    expect(conflicts).toEqual([]);
  });

  it('detects show and hide conflicts inside the same rule', () => {
    const conflicts = findConditionalRuleConflicts([
      rule('invalid', 'type', 'tipo_cliente', 'pj', {
        showFieldIds: ['cnpj'],
        hideFieldIds: ['cnpj'],
      }),
    ]);

    expect(conflicts).toEqual([
      {
        fieldId: 'cnpj',
        ruleIds: ['invalid', 'invalid'],
        reason: 'same-rule',
      },
    ]);
  });

  it('uses rule order to decide the final state when active rules overlap', () => {
    const visibility = resolveConditionalVisibility(
      fields,
      [
        rule('type-company', 'type', 'tipo_cliente', 'pj', {
          showFieldIds: ['cnpj'],
          hideFieldIds: [],
        }),
        rule('status-active', 'status', 'status_cliente', 'active', {
          showFieldIds: [],
          hideFieldIds: ['cnpj'],
        }),
      ],
      {
        tipo_cliente: 'pj',
        status_cliente: 'active',
      },
    );

    expect(visibility.visibleFields.map((item) => item._id)).toEqual([
      'type',
      'cpf',
      'birthDate',
      'companyMembers',
    ]);
  });
});
