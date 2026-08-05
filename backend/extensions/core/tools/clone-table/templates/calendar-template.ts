import {
  buildFieldPermissions,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_TABLE_STYLE,
  type IField,
} from '@application/core/entity.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import type { CloneTableDeps } from '../clone-table.types';

import { createGroupNativeFields } from './group-natives-helper';
import type {
  TableTemplateDescriptor,
  TemplateFieldSet,
} from './table-template-contract.service';
import { createTemplateField } from './template-field-helper';

export const CALENDAR_TEMPLATE: TableTemplateDescriptor = {
  description: 'Calendário de agendamentos',
  style: E_TABLE_STYLE.CALENDAR,
  beforeSave: `
(async () => {
  var titulo = field.get('titulo') || 'Sem título';
  var inicio = field.get('data-inicio');
  var termino = field.get('data-termino');
  var inicioFmt = inicio ? utils.formatDate(new Date(inicio), 'dd/MM/yyyy HH:mm') : '-';
  var terminoFmt = termino ? utils.formatDate(new Date(termino), 'dd/MM/yyyy HH:mm') : '-';
  var tabela = context.table.name || '';
  var link = context.appUrl + '/tables/' + context.table.slug;

  var participantes = field.get('participantes') || [];
  var emails = Array.isArray(participantes)
    ? participantes
  .map(function (p) {
    if (p && typeof p === 'object') return p.email || null;
    if (typeof p === 'string' && p.includes('@')) return p;
    return null;
  })
  .filter(Boolean)
    : [];

  var prevRaw = field.get('participantes-notificados') || '[]';
  var prev = [];
  try {
    prev = Array.isArray(prevRaw) ? prevRaw : JSON.parse(prevRaw);
  } catch (e) {
    prev = [];
  }
  var prevSet = new Set(prev.filter(Boolean));
  var newEmails = emails.filter(function (e) { return !prevSet.has(e); });

  if (newEmails.length > 0) {
    var detalhes = {};
    if (tabela) detalhes['Tabela'] = tabela;
    detalhes['Evento'] = titulo;
    detalhes['Início'] = inicioFmt;
    detalhes['Término'] = terminoFmt;
    detalhes['Acessar'] = link;
    await email.sendTemplate(
      newEmails,
      'Você foi adicionado a um evento',
      'Você foi adicionado como participante em um evento do calendário.',
      detalhes
    );
    field.set(
      'participantes-notificados',
      JSON.stringify([...prevSet, ...newEmails])
    );
  }

  if (!context.isNew && emails.length > 0) {
    var datasRaw = field.get('datas-anteriores') || '{}';
    var datasAnteriores = {};
    try {
      datasAnteriores = typeof datasRaw === 'string' ? JSON.parse(datasRaw) : datasRaw;
    } catch (e) {
      datasAnteriores = {};
    }

    var inicioStr = inicio ? String(inicio) : '';
    var terminoStr = termino ? String(termino) : '';
    var inicioAnterior = datasAnteriores.inicio || '';
    var terminoAnterior = datasAnteriores.termino || '';

    if ((inicioStr && inicioStr !== inicioAnterior) || (terminoStr && terminoStr !== terminoAnterior)) {
      var detalhesReag = {};
      if (tabela) detalhesReag['Tabela'] = tabela;
      detalhesReag['Evento'] = titulo;
      detalhesReag['Novo início'] = inicioFmt;
      detalhesReag['Novo término'] = terminoFmt;
      detalhesReag['Acessar'] = link;
      await email.sendTemplate(
  emails,
  'Evento reagendado: ' + titulo,
  'O evento foi reagendado para um novo horário.',
  detalhesReag
      );
    }
  }

  field.set('datas-anteriores', JSON.stringify({
    inicio: inicio ? String(inicio) : '',
    termino: termino ? String(termino) : ''
  }));
})();
  `.trim(),
  async buildFields(deps: CloneTableDeps): Promise<TemplateFieldSet> {
    return buildCalendarFields(deps.fieldRepository, deps.schemaBuilder);
  },
};

export async function buildCalendarFields(
  fieldRepository: FieldContractRepository,
  schemaBuilder: SchemaBuilderContractService,
): Promise<TemplateFieldSet> {
  const createdFields: IField[] = [];

  const createField = createTemplateField(fieldRepository, createdFields);

  const titleField = await createField({
    name: 'Título',
    slug: 'titulo',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: true,
    format: E_FIELD_FORMAT.ALPHA_NUMERIC,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    locked: false,
    widthInForm: 50,
    widthInList: 50,
  });

  const descriptionField = await createField({
    name: 'Descrição',
    slug: 'descricao',
    type: E_FIELD_TYPE.TEXT_LONG,
    format: E_FIELD_FORMAT.PLAIN_TEXT,
    permissions: buildFieldPermissions(false, true, true),
    locked: false,
  });

  const startField = await createField({
    name: 'Data e hora de início',
    slug: 'data-inicio',
    type: E_FIELD_TYPE.DATE,
    required: true,
    format: E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS_DASH,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    locked: false,
    widthInForm: 50,
    widthInList: 50,
  });

  const endField = await createField({
    name: 'Data e hora de término',
    slug: 'data-termino',
    type: E_FIELD_TYPE.DATE,
    required: true,
    format: E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS_DASH,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    locked: false,
    widthInForm: 50,
    widthInList: 50,
  });

  const colorField = await createField({
    name: 'Cor',
    slug: 'cor',
    type: E_FIELD_TYPE.DROPDOWN,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    locked: false,
    dropdown: [
      { id: 'azul', label: 'Azul', color: '#2563eb' },
      { id: 'verde', label: 'Verde', color: '#16a34a' },
      { id: 'vermelho', label: 'Vermelho', color: '#dc2626' },
      { id: 'laranja', label: 'Laranja', color: '#ea580c' },
      { id: 'roxo', label: 'Roxo', color: '#7c3aed' },
      { id: 'cinza', label: 'Cinza', color: '#6b7280' },
    ],
    widthInForm: 50,
    widthInList: 50,
  });

  const participantsField = await createField({
    name: 'Participantes',
    slug: 'participantes',
    type: E_FIELD_TYPE.USER,
    multiple: true,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: true,
    locked: false,
    widthInList: 50,
  });

  await createField({
    name: 'Participantes notificados',
    slug: 'participantes-notificados',
    type: E_FIELD_TYPE.TEXT_LONG,
    format: E_FIELD_FORMAT.PLAIN_TEXT,
    permissions: buildFieldPermissions(false, false, false),
    widthInForm: null,
    widthInList: null,
  });

  await createField({
    name: 'Datas anteriores',
    slug: 'datas-anteriores',
    type: E_FIELD_TYPE.TEXT_LONG,
    format: E_FIELD_FORMAT.PLAIN_TEXT,
    permissions: buildFieldPermissions(false, false, false),
    widthInForm: null,
    widthInList: null,
  });

  // Sub-fields for "Lembrete" group
  const reminderGroupSlug = 'lembrete';

  const reminderUnitField = await fieldRepository.create({
    name: 'Unidade',
    slug: 'unidade',
    type: E_FIELD_TYPE.DROPDOWN,
    required: false,
    multiple: false,
    format: null,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: false,
    relationship: null,
    dropdown: [
      { id: 'minutos', label: 'Minutos', color: null },
      { id: 'horas', label: 'Horas', color: null },
      { id: 'dias', label: 'Dias', color: null },
    ],
    category: [],
    group: { slug: reminderGroupSlug },
    widthInForm: 50,
    widthInList: 50,
    widthInDetail: null,
  });

  const reminderValueField = await fieldRepository.create({
    name: 'Valor',
    slug: 'valor',
    type: E_FIELD_TYPE.TEXT_SHORT,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.INTEGER,
    permissions: buildFieldPermissions(true, true, true),
    showInFilter: false,
    defaultValue: null,
    locked: false,
    relationship: null,
    dropdown: [],
    category: [],
    group: { slug: reminderGroupSlug },
    widthInForm: 50,
    widthInList: 50,
    widthInDetail: null,
  });

  const reminderNatives = await createGroupNativeFields(
    fieldRepository,
    reminderGroupSlug,
  );

  const reminderGroupFields = [
    ...reminderNatives,
    reminderUnitField,
    reminderValueField,
  ];

  const reminderGroup = {
    slug: reminderGroupSlug,
    name: 'Lembrete',
    fields: reminderGroupFields,
    _schema: schemaBuilder.build(reminderGroupFields),
  };

  const reminderGroupField = await createField({
    name: 'Lembrete',
    slug: reminderGroupSlug,
    type: E_FIELD_TYPE.FIELD_GROUP,
    multiple: true,
    permissions: buildFieldPermissions(false, true, true),
    locked: false,
    group: { slug: reminderGroupSlug },
    widthInList: null,
  });

  return {
    fields: createdFields,
    groups: [reminderGroup],
    orderList: [
      titleField._id,
      startField._id,
      endField._id,
      colorField._id,
      participantsField._id,
      descriptionField._id,
    ],
    orderForm: [
      titleField._id,
      descriptionField._id,
      startField._id,
      endField._id,
      colorField._id,
      participantsField._id,
      reminderGroupField._id,
    ],
    orderFilter: [
      titleField._id,
      startField._id,
      endField._id,
      colorField._id,
      participantsField._id,
    ],
    orderDetail: [
      titleField._id,
      descriptionField._id,
      startField._id,
      endField._id,
      colorField._id,
      participantsField._id,
      reminderGroupField._id,
    ],
  };
}
