/**
 * Normalizes a slug by replacing hyphens with underscores
 * Example: 'data-nascimento' → 'data_nascimento'
 */
export function normalizeSlug(slug: string): string {
  return slug.replace(/-/g, '_');
}

/**
 * Resolves a field value from a document by slug
 * Handles both normalized (underscore) and original (hyphen) formats
 */
export function resolveFieldValue(
  doc: Record<string, unknown>,
  slug: string,
): unknown {
  // Try the original slug first
  if (slug in doc) {
    return doc[slug];
  }

  // Try with hyphens replaced by underscores
  const normalizedSlug = normalizeSlug(slug);
  if (normalizedSlug in doc) {
    return doc[normalizedSlug];
  }

  // Try with underscores replaced by hyphens
  const hyphenSlug = slug.replace(/_/g, '-');
  if (hyphenSlug in doc) {
    return doc[hyphenSlug];
  }

  return undefined;
}

/**
 * Converts a value intelligently based on its content
 * - String numbers → Number
 * - "true"/"false" → Boolean
 * - ISO date strings → Date
 */
export function convertValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Don't convert non-strings
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  // Boolean conversion
  if (trimmed.toLowerCase() === 'true') {
    return true;
  }
  if (trimmed.toLowerCase() === 'false') {
    return false;
  }

  // Number conversion (only for non-empty strings that look like numbers)
  if (trimmed !== '' && !isNaN(Number(trimmed))) {
    const numValue = Number(trimmed);
    if (Number.isInteger(numValue)) return numValue;
    return parseFloat(trimmed);
  }

  // ISO date string conversion
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
  if (isoDateRegex.test(trimmed)) {
    const dateValue = new Date(trimmed);
    if (!isNaN(dateValue.getTime())) {
      return dateValue;
    }
  }

  return value;
}
