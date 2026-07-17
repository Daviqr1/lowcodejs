import slugify from 'slugify';

import { right } from '@application/core/either.core';
import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  FIELD_NATIVE_LIST,
  type IField,
  type IFieldPermissions,
  type IGroupConfiguration,
} from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { TableCreatePayload } from '@application/repositories/table/table-contract.repository';
import type { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import type {
  CloneTableDeps,
  CloneTableResponse,
  CloneTableUseCasePayload,
} from '../clone-table.types';

import { createGroupNativeFields } from './group-natives-helper';

export async function createKanbanTemplate(
  payload: CloneTableUseCasePayload,
  deps: CloneTableDeps,
): Promise<CloneTableResponse> {
  const newSlug = slugify(payload.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  const { fields, groups, orderList, orderForm, orderFilter, orderDetail } =
    await buildKanbanFields(deps.fieldRepository, deps.schemaBuilder);
  const nativeFields = await deps.fieldRepository.createMany(FIELD_NATIVE_LIST);
  const nativeFieldIds = nativeFields.map((field) => field._id);

  const _schema = deps.schemaBuilder.build(
    [...nativeFields, ...fields],
    groups,
  );

  const createPayload: TableCreatePayload = {
    _schema,
    name: payload.name,
    slug: newSlug,
    description: 'Kanban de tarefas',
    type: E_TABLE_TYPE.TABLE,
    logo: null,
    fields: [...nativeFieldIds, ...fields.map((f) => f._id)],
    style: E_TABLE_STYLE.KANBAN,
    owner: payload.ownerId,
    fieldOrderList: [...nativeFieldIds, ...orderList],
    fieldOrderForm: [...nativeFieldIds, ...orderForm],
    fieldOrderFilter: [...nativeFieldIds, ...orderFilter],
    fieldOrderDetail: [...nativeFieldIds, ...orderDetail],
    methods: {
      onLoad: { code: null },
      beforeSave: {
        code: `
(async () => {
  var titulo = field.get('titulo') || 'Sem título';
  var lista = String(field.get('lista') || '');
  var listaLabel = field.getLabel('lista');
  var link = context.appUrl + '/tables/' + context.table.slug;
  var tabela = context.table.name || '';
  var detalhesBase = {};
  if (tabela) detalhesBase['Tabela'] = tabela;
  detalhesBase['Tarefa'] = titulo;
  detalhesBase['Status'] = listaLabel || '-';
  detalhesBase['Acessar'] = link;

  var membros = field.get('membros') || [];
  var emails = Array.isArray(membros)
    ? membros
        .map(function (m) {
          if (m && typeof m === 'object') return m.email || null;
          if (typeof m === 'string' && m.includes('@')) return m;
          return null;
        })
        .filter(Boolean)
    : [];

  var prevRaw = field.get('membros-notificados') || '[]';
  var prev = [];
  try {
    prev = Array.isArray(prevRaw) ? prevRaw : JSON.parse(prevRaw);
  } catch (e) {
    prev = [];
  }
  var prevSet = new Set(prev.filter(Boolean));
  var newEmails = emails.filter(function (e) { return !prevSet.has(e); });
  if (newEmails.length > 0) {
    await email.sendTemplate(
      newEmails,
      'Você foi adicionado a uma tarefa',
      'Você foi adicionado como membro em uma tarefa do Kanban.',
      detalhesBase
    );
    field.set(
      'membros-notificados',
      JSON.stringify([...prevSet, ...newEmails])
    );
  }

  var statusAtual = lista;
  var statusAnterior = String(field.get('status-anterior') || '');
  if (statusAtual && statusAnterior && statusAtual !== statusAnterior && !context.isNew) {
    if (emails.length > 0) {
      var labelAnterior = field.getLabel('lista', statusAnterior);
      var detalhesStatus = {};
      if (tabela) detalhesStatus['Tabela'] = tabela;
      detalhesStatus['Tarefa'] = titulo;
      detalhesStatus['De'] = labelAnterior;
      detalhesStatus['Para'] = listaLabel;
      detalhesStatus['Acessar'] = link;
      await email.sendTemplate(
        emails,
        'Status alterado: ' + titulo,
        'O status da tarefa foi alterado.',
        detalhesStatus
      );
    }
  }
  if (statusAtual) {
    field.set('status-anterior', statusAtual);
  }

  var progresso = Number(field.get('porcentagem-concluida') || 0);
  var notificado = String(field.get('concluido-notificado')) === 'true';
  if (progresso >= 100 && !notificado) {
    if (emails.length > 0) {
      var detalhesConc = {};
      if (tabela) detalhesConc['Tabela'] = tabela;
      detalhesConc['Tarefa'] = titulo;
      detalhesConc['Progresso'] = '100%';
      detalhesConc['Acessar'] = link;
      await email.sendTemplate(
        emails,
        'Tarefa concluída: ' + titulo,
        'A tarefa atingiu 100% de progresso.',
        detalhesConc
      );
    }
    field.set('concluido-notificado', 'true');
  }
  if (progresso < 100 && notificado) {
    field.set('concluido-notificado', 'false');
  }
})();
        `.trim(),
      },
      afterSave: { code: null },
    },
    groups,
  };

  const newTable = await deps.tableRepository.create(createPayload);

  return right({
    table: newTable,
    fieldIdMap: {},
  });
}

export async function buildKanbanFields(
  fieldRepository: FieldContractRepository,
  schemaBuilder: SchemaBuilderContractService,
): Promise<{
  fields: IField[];
  groups: IGroupConfiguration[];
  orderList: string[];
  orderForm: string[];
  orderFilter: string[];
  orderDetail: string[];
}> {
  const createdFields: IField[] = [];

  const createField = async (payload: {
    name: string;
    slug: string;
    type: IField['type'];
    required: boolean;
    multiple: boolean;
    format: IField['format'];
    permissions: IFieldPermissions;
    showInFilter: boolean;
    defaultValue: IField['defaultValue'];
    locked: boolean;
    relationship: IField['relationship'];
    dropdown: IField['dropdown'];
    category: IField['category'];
    group: IField['group'];
    widthInForm: IField['widthInForm'];
    widthInList: IField['widthInList'];
    widthInDetail: IField['widthInDetail'];
  }): Promise<IField> => {
    const field = await fieldRepository.create({
      ...payload,
    });
    createdFields.push(field);
    return field;
  };

  const titleField = await createField({
    name: 'Título',
    slug: 'titulo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: true,
    multiple: false,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const descriptionField = await createField({
    name: 'Descrição',
    slug: 'descricao',
    type: E_FIELD_TYPE.TEXT_LONG,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.RICH_TEXT,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const membersField = await createField({
    name: 'Membros',
    slug: 'membros',
    type: E_FIELD_TYPE.USER,
    required: false,
    multiple: true,
    format: null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: true,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  await createField({
    name: 'Membros notificados',
    slug: 'membros-notificados',
    type: E_FIELD_TYPE.TEXT_LONG,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.PLAIN_TEXT,
    permissions: buildFieldPermissions(false, false, false),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  await createField({
    name: 'Conclusão notificada',
    slug: 'concluido-notificado',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    permissions: buildFieldPermissions(false, false, false),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  await createField({
    name: 'Status anterior',
    slug: 'status-anterior',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    permissions: buildFieldPermissions(false, false, false),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const dueDateField = await createField({
    name: 'Data de vencimento',
    slug: 'data-de-vencimento',
    type: E_FIELD_TYPE.DATE,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const startDateField = await createField({
    name: 'Data de início',
    slug: 'data-de-inicio',
    type: E_FIELD_TYPE.DATE,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const progressField = await createField({
    name: 'Porcentagem concluída',
    slug: 'porcentagem-concluida',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DECIMAL,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const listField = await createField({
    name: 'Lista',
    slug: 'lista',
    type: E_FIELD_TYPE.DROPDOWN,
    required: true,
    multiple: false,
    format: null,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [
      { id: 'todo', label: 'A Fazer', color: '#ef4444' },
      { id: 'doing', label: 'Fazendo', color: '#f59e0b' },
      { id: 'done', label: 'Feito', color: '#22c55e' },
    ],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const attachmentsGroupSlug = 'anexos';
  const tasksGroupSlug = 'tarefas';
  const commentsGroupSlug = 'comentarios';

  const attachmentFileField = await fieldRepository.create({
    name: 'Arquivos',
    slug: 'arquivos',
    type: E_FIELD_TYPE.FILE,
    required: false,
    multiple: true,
    format: null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const taskTitleField = await fieldRepository.create({
    name: 'Título',
    slug: 'titulo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: true,
    multiple: false,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const taskDoneField = await fieldRepository.create({
    name: 'Realizado',
    slug: 'realizado',
    type: E_FIELD_TYPE.DROPDOWN,
    required: false,
    multiple: false,
    format: null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [
      { id: 'sim', label: 'Sim', color: '#22c55e' },
      { id: 'nao', label: 'Não', color: '#ef4444' },
    ],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const commentTextField = await fieldRepository.create({
    name: 'Comentário',
    slug: 'comentario',
    type: E_FIELD_TYPE.TEXT_LONG,
    required: true,
    multiple: false,
    format: E_FIELD_FORMAT.RICH_TEXT,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const commentMentionsField = await fieldRepository.create({
    name: 'Menções',
    slug: 'mencoes',
    type: E_FIELD_TYPE.USER,
    required: false,
    multiple: true,
    format: null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const commentMentionNotifiedField = await fieldRepository.create({
    name: 'Menções notificadas',
    slug: 'mencoes-notificadas',
    type: E_FIELD_TYPE.TEXT_LONG,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.PLAIN_TEXT,
    permissions: buildFieldPermissions(false, false, false),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const commentAuthorField = await fieldRepository.create({
    name: 'Autor',
    slug: 'autor',
    type: E_FIELD_TYPE.USER,
    required: false,
    multiple: false,
    format: null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const commentDateField = await fieldRepository.create({
    name: 'Data',
    slug: 'data',
    type: E_FIELD_TYPE.DATE,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const attachmentAuthorField = await fieldRepository.create({
    name: 'Autor',
    slug: 'autor',
    type: E_FIELD_TYPE.USER,
    required: false,
    multiple: false,
    format: null,
    permissions: buildFieldPermissions(false, false, false),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const attachmentDateField = await fieldRepository.create({
    name: 'Data',
    slug: 'data',
    type: E_FIELD_TYPE.DATE,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
    permissions: buildFieldPermissions(false, false, false),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const attachmentsNatives = await createGroupNativeFields(
    fieldRepository,
    attachmentsGroupSlug,
  );
  const tasksNatives = await createGroupNativeFields(
    fieldRepository,
    tasksGroupSlug,
  );
  const commentsNatives = await createGroupNativeFields(
    fieldRepository,
    commentsGroupSlug,
  );

  const attachmentsGroupFields = [
    ...attachmentsNatives,
    attachmentFileField,
    attachmentAuthorField,
    attachmentDateField,
  ];
  const tasksGroupFields = [...tasksNatives, taskTitleField, taskDoneField];
  const commentsGroupFields = [
    ...commentsNatives,
    commentTextField,
    commentAuthorField,
    commentDateField,
    commentMentionsField,
    commentMentionNotifiedField,
  ];

  const attachmentsGroup: IGroupConfiguration = {
    slug: attachmentsGroupSlug,
    name: 'Anexos',
    fields: attachmentsGroupFields,
    _schema: schemaBuilder.build(attachmentsGroupFields),
  };

  const tasksGroup: IGroupConfiguration = {
    slug: tasksGroupSlug,
    name: 'Tarefas',
    fields: tasksGroupFields,
    _schema: schemaBuilder.build(tasksGroupFields),
  };

  const commentsGroup: IGroupConfiguration = {
    slug: commentsGroupSlug,
    name: 'Comentários',
    fields: commentsGroupFields,
    _schema: schemaBuilder.build(commentsGroupFields),
  };

  const attachmentsGroupField = await createField({
    name: 'Anexos',
    slug: attachmentsGroupSlug,
    type: E_FIELD_TYPE.FIELD_GROUP,
    required: false,
    multiple: true,
    format: null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: { slug: attachmentsGroupSlug },
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const tasksGroupField = await createField({
    name: 'Tarefas',
    slug: tasksGroupSlug,
    type: E_FIELD_TYPE.FIELD_GROUP,
    required: false,
    multiple: true,
    format: null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: { slug: tasksGroupSlug },
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const commentsGroupField = await createField({
    name: 'Comentários',
    slug: commentsGroupSlug,
    type: E_FIELD_TYPE.FIELD_GROUP,
    required: false,
    multiple: true,
    format: null,
    permissions: buildFieldPermissions(false, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: true,
    relationship: null,
    dropdown: [],
    category: [],
    group: { slug: commentsGroupSlug },
    widthInForm: null,
    widthInList: null,
    widthInDetail: null,
  });

  const groups = [attachmentsGroup, tasksGroup, commentsGroup];

  const orderList = [
    titleField._id,
    listField._id,
    progressField._id,
    startDateField._id,
    dueDateField._id,
    membersField._id,
    attachmentsGroupField._id,
    tasksGroupField._id,
    commentsGroupField._id,
    descriptionField._id,
  ];

  const orderForm = [
    titleField._id,
    descriptionField._id,
    listField._id,
    membersField._id,
    startDateField._id,
    dueDateField._id,
    progressField._id,
    attachmentsGroupField._id,
    tasksGroupField._id,
    commentsGroupField._id,
  ];

  const orderFilter = [
    titleField._id,
    listField._id,
    membersField._id,
    startDateField._id,
    dueDateField._id,
  ];

  const orderDetail = orderForm;

  return {
    fields: createdFields,
    groups,
    orderList,
    orderForm,
    orderFilter,
    orderDetail,
  };
}
