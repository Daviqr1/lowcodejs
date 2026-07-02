import mongoose from 'mongoose';

import {
  E_PERMISSION_TARGET,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  Merge,
  type ITable as Core,
} from '@application/core/entity.core';

// Binding de uma acao da tabela: a quem ela esta liberada.
const PermissionBinding = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: Object.values(E_PERMISSION_TARGET),
      default: E_PERMISSION_TARGET.NOBODY,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserGroup',
      default: null,
    },
  },
  { _id: false },
);

// Convidado da tabela com seu perfil de colaboracao.
const TableMember = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    profile: {
      type: String,
      enum: Object.values(E_TABLE_PROFILE),
      default: E_TABLE_PROFILE.VIEWER,
    },
  },
  { _id: false },
);

// Mapa das 10 acoes da tabela -> binding. Cada acao usa as chaves do
// E_TABLE_PERMISSION (VIEW_TABLE, UPDATE_TABLE, ...).
const TablePermissions = new mongoose.Schema(
  {
    VIEW_TABLE: { type: PermissionBinding },
    UPDATE_TABLE: { type: PermissionBinding },
    CREATE_FIELD: { type: PermissionBinding },
    UPDATE_FIELD: { type: PermissionBinding },
    REMOVE_FIELD: { type: PermissionBinding },
    VIEW_FIELD: { type: PermissionBinding },
    CREATE_ROW: { type: PermissionBinding },
    UPDATE_ROW: { type: PermissionBinding },
    REMOVE_ROW: { type: PermissionBinding },
    VIEW_ROW: { type: PermissionBinding },
  },
  { _id: false },
);

const LayoutFields = new mongoose.Schema(
  {
    title: { type: String, default: null },
    description: { type: String, default: null },
    cover: { type: String, default: null },
    category: { type: String, default: null },
    startDate: { type: String, default: null },
    endDate: { type: String, default: null },
    color: { type: String, default: null },
    participants: { type: String, default: null },
    reminder: { type: String, default: null },
  },
  { _id: false },
);

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

const GroupConfiguration = new mongoose.Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    fields: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Field' }],
    _schema: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true, timestamps: true, id: false },
);

const Methods = new mongoose.Schema(
  {
    onLoad: {
      code: {
        type: String,
        default: null,
      },
    },
    beforeSave: {
      code: {
        type: String,
        default: null,
      },
    },
    afterSave: {
      code: {
        type: String,
        default: null,
      },
    },
  },
  {
    _id: false,
  },
);

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    _schema: { type: mongoose.Schema.Types.Mixed },
    name: { type: String, required: true },
    description: { type: String, default: null },
    logo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Storage',
      default: null,
    },
    slug: { type: String, required: true },
    fields: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Field',
      },
    ],
    type: {
      type: String,
      enum: Object.values(E_TABLE_TYPE),
      default: E_TABLE_TYPE.TABLE,
    },
    style: {
      type: String,
      enum: Object.values(E_TABLE_STYLE),
      default: E_TABLE_STYLE.LIST,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Modelo de permissoes por acao (mapa das 10 acoes → binding).
    permissions: {
      type: TablePermissions,
      default: null,
    },
    // Convidados da tabela e seus perfis.
    members: {
      type: [TableMember],
      default: [],
    },
    fieldOrderList: {
      type: [String],
      default: [],
    },
    fieldOrderForm: {
      type: [String],
      default: [],
    },
    fieldOrderFilter: {
      type: [String],
      default: [],
    },
    fieldOrderDetail: {
      type: [String],
      default: [],
    },
    methods: {
      type: Methods,
      default: {
        onLoad: { code: null },
        beforeSave: { code: null },
        afterSave: { code: null },
      },
    },
    groups: {
      type: [GroupConfiguration],
      default: [],
    },
    order: {
      field: { type: String, default: null },
      direction: { type: String, enum: ['asc', 'desc'], default: null },
    },
    layoutFields: {
      type: LayoutFields,
      default: {
        title: null,
        description: null,
        cover: null,
        category: null,
        startDate: null,
        endDate: null,
        color: null,
        participants: null,
        reminder: null,
      },
    },
    rowSlugFieldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Field',
      default: null,
    },

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

export const Table: mongoose.Model<Entity> =
  mongoose?.models?.Table || mongoose.model<Entity>('Table', Schema, 'tables');
