/* eslint-disable @typescript-eslint/explicit-function-return-type */
import mongoose from 'mongoose';

import type { IField as Core, Merge } from '@application/core/entity.core';
import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_PERMISSION_TARGET,
} from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

// Binding de visibilidade do campo num contexto (lista/formulario/detalhe).
const FieldPermissionBinding = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: Object.values(E_PERMISSION_TARGET),
      default: E_PERMISSION_TARGET.PUBLIC,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserGroup',
      default: null,
    },
  },
  { _id: false },
);

const FieldPermissions = new mongoose.Schema(
  {
    list: { type: FieldPermissionBinding },
    form: { type: FieldPermissionBinding },
    detail: { type: FieldPermissionBinding },
  },
  { _id: false },
);

const FieldLabel = new mongoose.Schema(
  {
    list: { type: String, default: null },
    filter: { type: String, default: null },
    form: { type: String, default: null },
    detail: { type: String, default: null },
  },
  { _id: false },
);

const RelationshipLabelPart = new mongoose.Schema(
  {
    path: { type: String, required: true },
    label: { type: String, default: null },
  },
  {
    _id: false,
  },
);

const Relationship = new mongoose.Schema(
  {
    table: {
      _id: { type: mongoose.Schema.Types.ObjectId, required: true },
      slug: { type: String, required: true },
    },
    field: {
      _id: { type: mongoose.Schema.Types.ObjectId, required: true },
      slug: { type: String, required: true },
    },
    order: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'asc',
    },
    customLabel: {
      type: Boolean,
      default: false,
    },
    labelParts: {
      type: [RelationshipLabelPart],
      default: [],
    },
    labelSeparator: {
      type: String,
      default: ' - ',
    },
    // Mostra a tabela interna de gestao deste lado (apresentacao). Default true.
    visible: {
      type: Boolean,
      default: true,
    },
    // Back-pointer para a RelationshipDefinition (fonte de verdade do vinculo).
    relationshipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RelationshipDefinition',
      default: null,
    },
    // Lado da definition que este campo representa ('source' = declarante,
    // 'target' = espelho). Usado pela tela de detalhe para chamar /links.
    side: {
      type: String,
      enum: ['source', 'target'],
      default: null,
    },
    // Como o relacionamento aparece no formulário: 'select' (multi-select de
    // vínculo direto, padrão histórico) ou 'manage' (tabelas internas / cards +
    // Sheet). Ausência = 'select'.
    formMode: {
      type: String,
      enum: ['select', 'manage'],
      default: 'select',
    },
    // Comportamento ao excluir (denormalizado; fonte de verdade é
    // RelationshipDefinition.onDelete). Nullable.
    onDelete: {
      type: String,
      default: null,
    },
    // Config denormalizada do lado oposto (espelho). `mirror.multiple` é o
    // `multiple` do campo do outro endpoint e deriva a cardinalidade/role sem
    // ida ao DB (RelationshipStorage.roleOfField). Sem isto, o role cai sempre
    // no fallback legado (pivô). Default null = ausente (dados pré-migration).
    mirror: {
      type: new mongoose.Schema(
        {
          multiple: { type: Boolean, default: false },
          visible: { type: Boolean, default: true },
          label: { type: String, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
    // Limite numerico de vinculos neste lado (null = ilimitado).
    max: {
      type: Number,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const Group = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, default: null },
    slug: { type: String, default: null },
  },
  {
    _id: false,
  },
);

function validateCategory(Category: unknown[] | null): boolean {
  // null é válido
  if (Category === null) return true;

  // Array vazio é válido
  if (Category.length === 0) return true;

  // Verificar se todos os elementos têm a estrutura correta
  return Category.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    return (
      'id' in item &&
      typeof item.id === 'string' &&
      'label' in item &&
      typeof item.label === 'string' &&
      'children' in item &&
      Array.isArray(item.children)
    );
  });
}

const Category = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    children: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      validate: {
        validator: validateCategory,
        message: 'children must be an array of {id, label, children}',
      },
    },
  },
  {
    _id: false,
  },
);

const Dropdown = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: null,
    },
    sortField: {
      type: String,
      default: null,
    },
    sortDirection: {
      type: String,
      enum: ['asc', 'desc'],
      default: null,
    },
  },
  {
    _id: false,
  },
);

// Uma regra de validacao configurada no campo (camada unica de validacao).
// `config` guarda os parametros da regra (ex.: { min, max } | { values }).
const Validation = new mongoose.Schema(
  {
    rule: { type: String, required: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    slug: { type: String },
    type: {
      type: String,
      enum: Object.values(E_FIELD_TYPE),
      default: E_FIELD_TYPE.TEXT_SHORT,
      required: true,
    },

    required: {
      type: Boolean,
      default: false,
    },
    multiple: {
      type: Boolean,
      default: false,
      required: true,
    },
    format: {
      type: String,
      enum: Object.values(E_FIELD_FORMAT),
      default: null,
    },
    // Regras de validacao de valor do campo (camada unica de validacao).
    validations: {
      type: [Validation],
      default: [],
    },
    // Exibe o campo na barra de filtros (config de UX, nao e permissao).
    showInFilter: {
      type: Boolean,
      default: false,
    },
    // Campos-filho de FIELD_GROUP: elegibilidade + visibilidade na listagem
    // geral da tabela pai (nao e permissao; ver IField em entity.core.ts).
    showInParentList: {
      type: Boolean,
      default: false,
    },
    visibleInParentList: {
      type: Boolean,
      default: false,
    },
    // Visibilidade por contexto (list/form/detail) → binding por grupo.
    permissions: {
      type: FieldPermissions,
      default: null,
    },
    widthInForm: {
      type: Number,
      default: 50,
    },
    widthInList: {
      type: Number,
      default: 10,
    },
    widthInDetail: {
      type: Number,
      default: 50,
    },
    // Limite de chips exibidos antes de resumir o restante em "+N" — aplicavel
    // aos campos DROPDOWN, RELATIONSHIP e USER quando multiple. null = sem
    // limite, exibe todos os selecionados.
    visibleChipsLimit: {
      type: Number,
      default: null,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    native: {
      type: Boolean,
      default: false,
    },
    // Rotulo customizado por contexto. `name` continua original (controla o slug).
    // Cada contexto sobrescreve o name apenas naquele local; null = usa o name.
    label: {
      type: FieldLabel,
      default: null,
    },
    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    tip: {
      type: String,
      default: null,
    },
    htmlContent: {
      type: String,
      default: null,
    },
    relationship: {
      type: Relationship,
      default: null,
    },
    dropdown: {
      type: [Dropdown],
      default: function (): null {
        return null;
      },
    },
    allowCustomDropdownOptions: {
      type: Boolean,
      default: false,
    },
    allowCreateRelationshipRecords: {
      type: Boolean,
      default: false,
    },
    // Campo USER: grava o usuario logado quando nenhum id vem no payload.
    fillWithCurrentUserWhenEmpty: {
      type: Boolean,
      default: false,
    },
    category: {
      type: [Category],
      default: function (): null {
        return null;
      },
      validate: {
        validator: validateCategory,
        message:
          'children deve ser um array de objetos com estrutura {id, label, children}',
      },
    },
    group: {
      type: Group,
      default: null,
    },
    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
    toJSON: {
      transform: function (_doc, ret: Record<string, unknown>) {
        // Garantir valores padrão para dropdown e category
        if (ret.dropdown === undefined) {
          ret.dropdown = null;
        }
        if (ret.category === undefined) {
          ret.category = null;
        }
        return ret;
      },
    },
  },
);

export const Field: mongoose.Model<Entity> =
  mongoose?.models?.Field || mongoose.model<Entity>('Field', Schema, 'fields');
