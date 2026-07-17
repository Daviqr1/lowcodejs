import { E_FIELD_TYPE, type IField } from '@application/core/entity.core';

const HTML_TAG_REGEX = /<[^>]*>/g;
const WHITESPACE_REGEX = /\s+/g;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const stripHtml = (value: string): string => {
  return value
    .replace(HTML_TAG_REGEX, ' ')
    .replace(WHITESPACE_REGEX, ' ')
    .trim();
};

/**
 * Resolve o "rótulo de exibição" de um valor relacional populado.
 * Tenta `name`, `title`, `label` e cai para `_id`.
 */
const pickRelationDisplay = (value: Record<string, unknown>): string => {
  const candidates = ['name', 'title', 'label', 'email', 'slug'] as const;
  for (const key of candidates) {
    const v = value[key];
    if (typeof v === 'string' && v.trim().length > 0) return v;
  }
  if (typeof value._id === 'string') return value._id;
  return '';
};

export type FormatContext = {
  /** Tipo do campo (para tabelas dinâmicas). */
  fieldType?: (typeof E_FIELD_TYPE)[keyof typeof E_FIELD_TYPE];
  /** Quando o campo for FILE, decidir entre filename e URL. */
  preferUrlForFiles?: boolean;
};

/**
 * Converte um valor arbitrário em uma representação textual segura para CSV.
 *
 * - Datas → ISO 8601
 * - Arrays → strings unidas por `; ` (relacionamentos viram display)
 * - Objetos populados → display ou JSON
 * - Texto rico (HTML) → texto plano
 */
export function formatCellValue(
  value: unknown,
  context: FormatContext = {},
): string {
  if (value === null || value === undefined) return '';

  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'boolean') {
    if (value) return 'true';
    return 'false';
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'string') {
    if (context.fieldType === E_FIELD_TYPE.TEXT_LONG) return stripHtml(value);
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatCellValue(item, context))
      .filter((s) => s.length > 0)
      .join('; ');
  }

  if (isRecord(value)) {
    const obj = value;

    if (context.fieldType === E_FIELD_TYPE.FILE) {
      let filename: string | null = null;
      if (typeof obj.originalName === 'string') filename = obj.originalName;
      let url: string | null = null;
      if (typeof obj.url === 'string') url = obj.url;
      if (context.preferUrlForFiles && url) return url;
      return filename ?? url ?? '';
    }

    // Dropdown/Category options costumam ter `label`
    if (typeof obj.label === 'string') return obj.label;

    // Relacionamentos populados
    const display = pickRelationDisplay(obj);
    if (display) return display;

    try {
      return JSON.stringify(obj);
    } catch {
      return '';
    }
  }

  return String(value);
}

/** Resolve o tipo de um field — útil quando o consumer só tem o slug. */
export function getFieldType(
  fields: IField[],
  slug: string,
): (typeof E_FIELD_TYPE)[keyof typeof E_FIELD_TYPE] | undefined {
  return fields.find((f) => f.slug === slug)?.type;
}
