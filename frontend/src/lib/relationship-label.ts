import { E_FIELD_TYPE } from './constant';
import type {
  IDropdown,
  IField,
  IFieldConfigurationRelationship,
  IRow,
} from './interfaces';

const DEFAULT_SEPARATOR = ' - ';

/** UUID (v4) ou ObjectId — formatos de identificador que nunca devem virar label. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID_REGEX = /^[0-9a-f]{24}$/i;

function isIdLike(value: string): boolean {
  return UUID_REGEX.test(value) || OBJECT_ID_REGEX.test(value);
}

/** Chaves que costumam conter o "título" de um registro relacionado. */
const DISPLAY_KEYS = [
  'name',
  'nome',
  'title',
  'titulo',
  'título',
  'label',
  'slug',
  'email',
];

/** Campos nativos/de sistema que não servem como rótulo. */
const NATIVE_KEYS = new Set([
  '_id',
  'id',
  '__v',
  'createdAt',
  'updatedAt',
  'trashed',
  'trashedAt',
]);

function scalarToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return '';
  const str = String(value);
  // Identificadores crus (UUID/ObjectId) não são título — suprime para não
  // exibir o ID do registro relacionado no lugar do nome.
  if (isIdLike(str)) return '';
  return str;
}

/**
 * Campos DROPDOWN guardam o `id` da opção no registro; o texto visível vem da
 * lista de opções configurada no campo (`field.dropdown`). Traduz cada id para
 * o respectivo label. Ids sem opção correspondente são omitidos (nunca exibimos
 * o id cru).
 */
function resolveDropdownValue(
  value: unknown,
  options: Array<IDropdown>,
): string {
  let ids: Array<unknown> = [value];
  if (Array.isArray(value)) ids = value;
  return ids
    .map((id) => {
      if (id === null || id === undefined) return '';
      const option = options.find((item) => item.id === String(id));
      return option?.label ?? '';
    })
    .filter((label) => label !== '')
    .join(', ');
}

/**
 * Extrai um rótulo legível de um objeto de registro relacionado já populado,
 * quando o caminho do label aponta diretamente para o relacionamento (em vez de
 * navegar até um campo escalar). Tenta as chaves de "título" mais comuns e, em
 * último caso, o primeiro campo escalar não-nativo.
 */
function pickObjectDisplay(obj: Record<string, unknown>): string {
  for (const key of DISPLAY_KEYS) {
    const resolved = resolveTerminal(obj[key]);
    if (resolved !== '') return resolved;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (NATIVE_KEYS.has(key)) continue;
    const resolved = scalarToString(value);
    if (resolved !== '') return resolved;
  }

  return '';
}

/**
 * Converte o valor final de um caminho em string de exibição:
 * - escalares viram texto (IDs crus são suprimidos);
 * - objetos populados (relacionamentos) são resolvidos ao seu título;
 * - arrays juntam os valores resolvidos por vírgula (dropdown múltiplo ou
 *   relacionamento múltiplo populado).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveTerminal(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return value
      .map((item) => resolveTerminal(item))
      .filter((resolved) => resolved !== '')
      .join(', ');
  }

  if (isRecord(value)) {
    return pickObjectDisplay(value);
  }

  return scalarToString(value);
}

/**
 * Resolve um caminho separado por pontos (ex: "nome", "categoria.nome",
 * "fornecedor.cidade.uf") contra uma linha (registro) relacionada já populada.
 *
 * Relacionamentos são armazenados como arrays de objetos populados; a cada
 * salto de relacionamento intermediário, pegamos o primeiro elemento do array.
 * No valor final:
 * - campos DROPDOWN têm o id da opção traduzido para o label (precisa de
 *   `fields`, as definições de campo da tabela relacionada);
 * - objetos populados (relacionamentos) são resolvidos ao seu título;
 * - arrays de escalares (ex: dropdown múltiplo) são juntados por vírgula.
 *
 * Identificadores crus (UUID/ObjectId) nunca são exibidos — quando um caminho
 * termina num relacionamento não populado, ou num dropdown cuja opção não foi
 * encontrada, retornamos vazio em vez do id.
 */
export function resolveRelationshipValue(
  source: unknown,
  path: string,
  fields?: Array<IField>,
): string {
  if (!path) return '';

  const keys = path.split('.');
  let current: unknown = source;
  let currentFields: Array<IField> | undefined = fields;
  let terminalField: IField | undefined;

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (Array.isArray(current)) current = current[0];
    if (current === null || current === undefined) return '';
    if (!isRecord(current)) return '';

    const field = currentFields?.find((item) => item.slug === key);
    current = current[key];

    if (index === keys.length - 1) {
      terminalField = field;
    } else {
      // Os campos das tabelas aninhadas não estão disponíveis no cliente;
      // seguimos sem contexto de campos a partir do próximo salto (objetos
      // populados são resolvidos por heurística).
      currentFields = undefined;
    }
  }

  if (terminalField?.type === E_FIELD_TYPE.DROPDOWN) {
    return resolveDropdownValue(current, terminalField.dropdown ?? []);
  }

  return resolveTerminal(current);
}

/**
 * Computa o label de exibição de uma opção de relacionamento.
 *
 * - Se `customLabel` estiver ativo e houver `labelParts`, compõe o label
 *   resolvendo cada caminho e juntando com `labelSeparator`.
 * - Caso contrário, usa o comportamento legado: `row[relConfig.field.slug]`.
 * - Fallback final: `row._id`.
 */
export function resolveRelationshipLabel(
  row: IRow,
  relConfig: IFieldConfigurationRelationship | null | undefined,
  fields?: Array<IField>,
): string {
  const fallback = String(row?._id ?? '');
  if (!relConfig) return fallback;

  if (
    relConfig.customLabel &&
    relConfig.labelParts &&
    relConfig.labelParts.length > 0
  ) {
    const separator = relConfig.labelSeparator ?? DEFAULT_SEPARATOR;
    const parts = relConfig.labelParts
      .map((part) => resolveRelationshipValue(row, part.path, fields))
      .filter((value) => value !== '');
    if (parts.length > 0) return parts.join(separator);
  }

  let single = '';
  if (relConfig.field?.slug) {
    single = resolveRelationshipValue(row, relConfig.field.slug, fields);
  }

  if (single !== '') return single;
  return fallback;
}
