import type { IField } from './interfaces';

export type ConditionalFieldRule = {
  id: string;
  label?: string;
  sourceFieldId: string;
  sourceFieldSlug: string;
  sourceValue: string;
  showFieldIds: Array<string>;
  hideFieldIds: Array<string>;
};

export type ConditionalFieldsConfig = {
  tableId: string;
  tableSlug: string;
  rules: Array<ConditionalFieldRule>;
};

export type ConditionalFormValues = Record<string, unknown>;

export type ConditionalVisibilityResult = {
  visibleFields: Array<IField>;
  hiddenFieldIds: Set<string>;
  activeRuleIds: Set<string>;
  conditionalFieldIds: Set<string>;
};

export type ConditionalFieldRuleConflict = {
  fieldId: string;
  ruleIds: [string, string];
  reason: 'same-rule';
};

type SearchableValue = {
  value?: unknown;
  id?: unknown;
  _id?: unknown;
};

function toStringValue(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function extractObjectValue(value: SearchableValue): string | null {
  return (
    toStringValue(value.value) ??
    toStringValue(value.id) ??
    toStringValue(value._id)
  );
}

export function extractConditionalValueIds(value: unknown): Array<string> {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          return extractObjectValue(item);
        }
        return toStringValue(item);
      })
      .filter((item): item is string => Boolean(item));
  }

  if (value && typeof value === 'object') {
    const objectValue = extractObjectValue(value);
    if (objectValue) return [objectValue];
    return [];
  }

  const scalarValue = toStringValue(value);
  if (scalarValue) return [scalarValue];
  return [];
}

export function doesConditionalRuleMatch(
  rule: ConditionalFieldRule,
  values: ConditionalFormValues,
): boolean {
  const valueIds = extractConditionalValueIds(values[rule.sourceFieldSlug]);
  return valueIds.includes(rule.sourceValue);
}

export function getConditionalFieldIds(
  rules: Array<ConditionalFieldRule>,
): Set<string> {
  const ids = new Set<string>();

  for (const rule of rules) {
    for (const fieldId of rule.showFieldIds) ids.add(fieldId);
    for (const fieldId of rule.hideFieldIds) ids.add(fieldId);
  }

  return ids;
}

export function findConditionalRuleConflicts(
  rules: Array<ConditionalFieldRule>,
): Array<ConditionalFieldRuleConflict> {
  const conflicts: Array<ConditionalFieldRuleConflict> = [];

  for (const rule of rules) {
    const sameRuleTargets = rule.showFieldIds.filter((fieldId) =>
      rule.hideFieldIds.includes(fieldId),
    );

    for (const fieldId of sameRuleTargets) {
      conflicts.push({
        fieldId,
        ruleIds: [rule.id, rule.id],
        reason: 'same-rule',
      });
    }
  }

  return conflicts;
}

export function resolveConditionalVisibility(
  fields: Array<IField>,
  rules: Array<ConditionalFieldRule>,
  values: ConditionalFormValues,
): ConditionalVisibilityResult {
  const conditionalFieldIds = getConditionalFieldIds(rules);
  const hiddenFieldIds = new Set(conditionalFieldIds);
  const activeRuleIds = new Set<string>();

  for (const rule of rules) {
    if (!doesConditionalRuleMatch(rule, values)) continue;

    activeRuleIds.add(rule.id);

    for (const fieldId of rule.showFieldIds) {
      hiddenFieldIds.delete(fieldId);
    }

    for (const fieldId of rule.hideFieldIds) {
      hiddenFieldIds.add(fieldId);
    }
  }

  return {
    visibleFields: fields.filter((field) => !hiddenFieldIds.has(field._id)),
    hiddenFieldIds,
    activeRuleIds,
    conditionalFieldIds,
  };
}

export function omitHiddenConditionalValues<T extends ConditionalFormValues>(
  values: T,
  fields: Array<IField>,
  hiddenFieldIds: Set<string>,
): T {
  const hiddenSlugs = new Set(
    fields
      .filter((field) => hiddenFieldIds.has(field._id))
      .map((field) => field.slug),
  );

  // Coerção genérica: Object.fromEntries perde o tipo T do parâmetro.
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !hiddenSlugs.has(key)),
  ) as T;
}
