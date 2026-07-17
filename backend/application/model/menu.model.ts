import mongoose from 'mongoose';

import {
  E_MENU_ITEM_TYPE,
  E_PERMISSION_TARGET,
  Merge,
  type IMenu as Core,
} from '@application/core/entity.core';

type Entity = Merge<Omit<Core, '_id'>, mongoose.Document>;

// Visibilidade da opção de menu (Grupo|Public|Nobody).
const MenuVisibility = new mongoose.Schema(
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

export const Schema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },

    name: { type: String, required: true },
    slug: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(E_MENU_ITEM_TYPE),
      default: E_MENU_ITEM_TYPE.SEPARATOR,
      required: true,
    },

    /** Tabela associada (para tipos 'table' e 'form') */
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
    },

    /** Item pai para hierarquia (auto-referência) */
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      default: null,
    },

    /** Conteúdo HTML para tipo 'page' */
    html: {
      type: String,
      default: null,
    },

    /** URL para tipo 'external-link' */
    url: {
      type: String,
      default: null,
    },

    /** URL da imagem usada como ícone (opcional). Quando ausente, o frontend
     *  cai para o ícone padrão por tipo de menu. */
    icon: {
      type: String,
      default: null,
    },

    /** Referência a extensão (apenas para tipo EXTENSION_MODULE) */
    extension: {
      type: {
        pkg: { type: String, required: true },
        extensionId: { type: String, required: true },
      },
      default: null,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    order: { type: Number, default: 0 },
    isInitial: { type: Boolean, default: false },

    /** Visibilidade da opção (Grupo|Public|Nobody). null = legado (visível). */
    visibility: { type: MenuVisibility, default: null },

    trashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    id: false,
  },
);

// Índices para otimização de consultas
Schema.index({ parent: 1, order: 1 });
Schema.index({ isInitial: 1 });
// Schema.index({ slug: 1 }, { unique: true });
// Schema.index({ trashed: 1 });

export const Menu: mongoose.Model<Entity> =
  mongoose?.models?.Menu || mongoose.model<Entity>('Menu', Schema, 'menus');
