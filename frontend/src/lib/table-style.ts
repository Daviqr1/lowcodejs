import { E_FIELD_TYPE, E_TABLE_STYLE } from './constant';
import type {
  IField,
  IGroupConfiguration,
  ITable,
  ValueOf,
} from './interfaces';

const BASIC_STYLES: Array<ValueOf<typeof E_TABLE_STYLE>> = [
  E_TABLE_STYLE.LIST,
  E_TABLE_STYLE.GALLERY,
  E_TABLE_STYLE.DOCUMENT,
];

function asFields(values?: Array<IField>): Array<IField> {
  if (!Array.isArray(values)) return [];
  return values.filter(
    (field): field is IField =>
      Boolean(field) &&
      typeof field === 'object' &&
      'slug' in field &&
      'type' in field,
  );
}

function getGroupBySlug(
  groups: Array<IGroupConfiguration>,
  slug: string,
): IGroupConfiguration | undefined {
  return groups.find((group) => group.slug === slug);
}

function getGroupFieldSlugs(group?: IGroupConfiguration): Set<string> {
  if (!group?.fields || !Array.isArray(group.fields)) return new Set();
  const slugs = group.fields
    .filter(
      (field): field is IField =>
        Boolean(field) &&
        typeof field === 'object' &&
        'slug' in field &&
        'type' in field,
    )
    .map((field) => field.slug);
  return new Set(slugs);
}

export function isForumTemplate(table?: ITable | null): boolean {
  if (!table) return false;
  const fields = asFields(table.fields);
  let groups: NonNullable<typeof table.groups> = [];
  if (Array.isArray(table.groups)) groups = table.groups;
  const messagesGroup = getGroupBySlug(groups, 'mensagens');
  const groupFieldSlugs = getGroupFieldSlugs(messagesGroup);
  const requiredGroupFields = ['mensagem-id', 'texto', 'autor', 'data'];
  const hasRequiredFields = requiredGroupFields.every((slug) =>
    groupFieldSlugs.has(slug),
  );
  const hasMessagesField = fields.some(
    (field) =>
      field.type === E_FIELD_TYPE.FIELD_GROUP && field.slug === 'mensagens',
  );

  return Boolean(messagesGroup && hasRequiredFields && hasMessagesField);
}

export function isKanbanTemplate(table?: ITable | null): boolean {
  if (!table) return false;
  const fields = asFields(table.fields);
  let groups: NonNullable<typeof table.groups> = [];
  if (Array.isArray(table.groups)) groups = table.groups;
  const tasksGroup = getGroupBySlug(groups, 'tarefas');
  const commentsGroup = getGroupBySlug(groups, 'comentarios');
  const taskGroupSlugs = getGroupFieldSlugs(tasksGroup);
  const hasTaskFields = ['titulo', 'realizado'].every((slug) =>
    taskGroupSlugs.has(slug),
  );
  const hasListField = fields.some(
    (field) => field.type === E_FIELD_TYPE.DROPDOWN && field.slug === 'lista',
  );
  const hasTaskGroupField = fields.some(
    (field) =>
      field.type === E_FIELD_TYPE.FIELD_GROUP && field.slug === 'tarefas',
  );

  return Boolean(
    hasListField &&
    tasksGroup &&
    commentsGroup &&
    hasTaskFields &&
    hasTaskGroupField,
  );
}

export function isCalendarTemplate(table?: ITable | null): boolean {
  if (!table) return false;
  const fields = asFields(table.fields);
  const hasTitleField = fields.some(
    (field) =>
      !field.trashed &&
      field.type === E_FIELD_TYPE.TEXT_SHORT &&
      field.slug === 'titulo',
  );
  const hasDescriptionField = fields.some(
    (field) =>
      !field.trashed &&
      field.type === E_FIELD_TYPE.TEXT_LONG &&
      field.slug === 'descricao',
  );
  const hasStartField = fields.some(
    (field) =>
      !field.trashed &&
      field.type === E_FIELD_TYPE.DATE &&
      field.slug === 'data-inicio',
  );
  const hasEndField = fields.some(
    (field) =>
      !field.trashed &&
      field.type === E_FIELD_TYPE.DATE &&
      field.slug === 'data-termino',
  );
  const hasColorField = fields.some(
    (field) =>
      !field.trashed &&
      field.type === E_FIELD_TYPE.DROPDOWN &&
      field.slug === 'cor',
  );

  return (
    hasTitleField &&
    hasDescriptionField &&
    hasStartField &&
    hasEndField &&
    hasColorField
  );
}

export function getAllowedTableStyles(
  table?: ITable | null,
): Array<ValueOf<typeof E_TABLE_STYLE>> {
  if (!table) return BASIC_STYLES;
  const fields = asFields(table.fields);

  const existFieldCategory = fields.some(
    (field) => !field.trashed && field.type === E_FIELD_TYPE.CATEGORY,
  );
  const existFieldTextShort = fields.some(
    (field) => !field.trashed && field.type === E_FIELD_TYPE.TEXT_SHORT,
  );
  const existFieldTextLong = fields.some(
    (field) => !field.trashed && field.type === E_FIELD_TYPE.TEXT_LONG,
  );
  const existFieldFile = fields.some(
    (field) => !field.trashed && field.type === E_FIELD_TYPE.FILE,
  );

  const canShowDocument = existFieldCategory && existFieldTextLong;
  const canShowCard =
    existFieldFile && existFieldTextLong && existFieldTextShort;
  const canShowMosaic =
    existFieldFile && existFieldTextLong && existFieldTextShort;

  const styles: Array<ValueOf<typeof E_TABLE_STYLE>> = [
    E_TABLE_STYLE.LIST,
    E_TABLE_STYLE.GALLERY,
  ];

  if (canShowDocument) styles.push(E_TABLE_STYLE.DOCUMENT);
  if (canShowCard) styles.push(E_TABLE_STYLE.CARD);
  if (canShowMosaic) styles.push(E_TABLE_STYLE.MOSAIC);

  if (isKanbanTemplate(table)) {
    styles.push(E_TABLE_STYLE.KANBAN);
    styles.push(E_TABLE_STYLE.GANTT);
  }
  if (isForumTemplate(table)) styles.push(E_TABLE_STYLE.FORUM);
  if (isCalendarTemplate(table)) styles.push(E_TABLE_STYLE.CALENDAR);

  return styles;
}
