import type { Either } from '@application/core/either.core';
import type {
  IField,
  IFieldPermissions,
  IFieldValidation,
  Merge,
} from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

import type { ExportTablePayload } from './_shared.validator';

export type ExportTableUseCasePayload = Merge<
  ExportTablePayload,
  {
    userId: string;
    userName: string;
  }
>;

export type ExportedField = {
  name: string;
  slug: string;
  type: IField['type'];
  required: boolean;
  multiple: boolean;
  format: IField['format'];
  validations?: IFieldValidation[];
  showInFilter: boolean;
  showInParentList?: boolean;
  visibleInParentList?: boolean;
  permissions?: IFieldPermissions | null;
  widthInForm: number | null;
  widthInList: number | null;
  widthInDetail: number | null;
  defaultValue: string | string[] | null;
  locked?: boolean;
  relationship: {
    tableSlug: string;
    fieldSlug: string;
    order: 'asc' | 'desc';
  } | null;
  dropdown: Array<{ id: string; label: string; color?: string | null }>;
  category: IField['category'];
  group: { slug: string } | null;
};

export type ExportedGroup = {
  slug: string;
  name: string;
  fields: ExportedField[];
};

export type ExportedStructure = {
  name: string;
  slug: string;
  description: string | null;
  style: string;
  fields: ExportedField[];
  groups: ExportedGroup[];
  fieldOrderList: string[];
  fieldOrderForm: string[];
  fieldOrderFilter: string[];
  fieldOrderDetail: string[];
  layoutFields: Record<string, string | null>;
  methods: {
    onLoad: { code: string | null };
    beforeSave: { code: string | null };
    afterSave: { code: string | null };
  };
};

export type ExportedRow = Merge<
  Record<string, unknown>,
  {
    _originalId: string;
    /** ID original do usuário criador da row (campo nativo CREATOR). */
    _originalCreator?: string;
  }
>;

export type ExportedTable = {
  /**
   * Identidade da tabela. Sempre presente — é o que permite a importação
   * "somente dados" casar com a tabela existente no destino (no export de
   * estrutura/completo o slug também vem em `structure.slug`).
   */
  tableSlug?: string;
  tableName?: string;
  structure?: ExportedStructure;
  data?: {
    totalRows: number;
    rows: ExportedRow[];
  };
};

export type ExportedMenu = {
  _originalId: string;
  name: string;
  slug: string;
  type: string;
  parent: string | null;
  url: string | null;
  html: string | null;
  order: number;
  isInitial: boolean;
  tableSlug: string | null;
  extension: { pkg: string; extensionId: string } | null;
};

export type ExportHeader = {
  version: string;
  platform: string;
  tableName: string;
  tableSlug: string;
  exportedBy: string;
  exportedAt: string;
  exportType: 'structure' | 'data' | 'full';
  tablesCount: number;
  menusCount: number;
};

export type ExportResult = {
  header: ExportHeader;
  tables: ExportedTable[];
  menus: ExportedMenu[];
};

export type ExportTableResponse = Either<HTTPException, ExportResult>;
