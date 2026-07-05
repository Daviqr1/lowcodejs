import { E_FIELD_TYPE } from '@/lib/constant';
import type { IField } from '@/lib/interfaces';

/**
 * Maps E_FIELD_TYPE to TypeScript type strings for Monaco IntelliSense
 */
export const FIELD_TYPE_TO_TS: Record<string, string> = {
  [E_FIELD_TYPE.TEXT_SHORT]: 'string',
  [E_FIELD_TYPE.TEXT_LONG]: 'string',
  [E_FIELD_TYPE.DROPDOWN]: 'string[]',
  [E_FIELD_TYPE.CATEGORY]: 'string[]',
  [E_FIELD_TYPE.DATE]: 'string | Date',
  [E_FIELD_TYPE.RELATIONSHIP]: 'string',
  [E_FIELD_TYPE.FILE]: 'string',
  [E_FIELD_TYPE.USER]: 'string',
  [E_FIELD_TYPE.FIELD_GROUP]: 'Record<string, any>[]',
  [E_FIELD_TYPE.REACTION]: 'string[]',
  [E_FIELD_TYPE.EVALUATION]: 'number[]',
};

/**
 * Gets the TypeScript type for a field
 */
export function getFieldTsType(field: IField): string {
  return FIELD_TYPE_TO_TS[field.type] ?? 'any';
}

/**
 * Normalizes a slug for use as a variable name
 * Replaces hyphens with underscores
 */
export function normalizeSlug(slug: string): string {
  return slug.replace(/-/g, '_');
}

/**
 * Generates TypeScript type declarations for field.get() overloads
 */
export function generateFieldGetOverloads(
  fields: Array<IField>,
  _tableSlug: string,
): string {
  const overloads: Array<string> = [];

  for (const field of fields) {
    const tsType = getFieldTsType(field);
    // Use original slug with hyphens
    overloads.push(`  get(slug: '${field.slug}'): ${tsType};`);
    // Also support normalized slug with underscores
    const normalizedSlug = normalizeSlug(field.slug);
    if (normalizedSlug !== field.slug) {
      overloads.push(`  get(slug: '${normalizedSlug}'): ${tsType};`);
    }
  }

  return overloads.join('\n');
}

/**
 * Generates TypeScript type declarations for field.set() overloads
 */
export function generateFieldSetOverloads(
  fields: Array<IField>,
  _tableSlug: string,
): string {
  const overloads: Array<string> = [];

  for (const field of fields) {
    const tsType = getFieldTsType(field);
    overloads.push(`  set(slug: '${field.slug}', value: ${tsType}): void;`);
    const normalizedSlug = normalizeSlug(field.slug);
    if (normalizedSlug !== field.slug) {
      overloads.push(
        `  set(slug: '${normalizedSlug}', value: ${tsType}): void;`,
      );
    }
  }

  return overloads.join('\n');
}

/**
 * Generates a union type of all field slugs for autocomplete
 */
export function generateFieldSlugsType(fields: Array<IField>): string {
  if (fields.length === 0) {
    return 'type FieldSlug = string;';
  }

  const slugs = new Set<string>();
  for (const field of fields) {
    slugs.add(`'${field.slug}'`);
    const normalizedSlug = normalizeSlug(field.slug);
    if (normalizedSlug !== field.slug) {
      slugs.add(`'${normalizedSlug}'`);
    }
  }

  return `type FieldSlug = ${Array.from(slugs).join(' | ')};`;
}

/**
 * Generates complete dynamic TypeScript declarations for a table
 */
export function generateDynamicTypes(
  fields: Array<IField>,
  tableSlug: string,
): string {
  const fieldGetOverloads = generateFieldGetOverloads(fields, tableSlug);
  const fieldSetOverloads = generateFieldSetOverloads(fields, tableSlug);
  const fieldSlugsType = generateFieldSlugsType(fields);

  // Generate field slug constants for autocomplete suggestions
  const fieldSlugsConst = fields
    .map((f) => `  '${f.slug}': '${f.slug}'`)
    .join(',\n');

  return `
// Available field slugs for this table
${fieldSlugsType}

// Field slug constants for autocomplete
declare const FIELD_SLUGS: {
${fieldSlugsConst}
};

// Dynamic field.get() and field.set() overloads for this table
type FieldApiDynamic = {
${fieldGetOverloads}
  get(slug: string): any;
${fieldSetOverloads}
  set(slug: string, value: any): void;
  getAll(): Record<string, any>;
}

// Re-declare field with dynamic overloads
declare const field: FieldApiDynamic;
`;
}
