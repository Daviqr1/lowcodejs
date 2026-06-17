import type {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_LOGGER_ACTION_TYPE,
  E_LOGGER_OBJECT_TYPE,
  E_MENU_ITEM_TYPE,
  E_REACTION_TYPE,
  E_ROLE,
  E_TABLE_COLLABORATION,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  E_TABLE_VISIBILITY,
  E_USER_STATUS,
} from './constant';
import type { Merge, ValueOf } from './interfaces';

// ============== AUTHENTICATION ==============
export type SignInPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  name: string;
  email: string;
  password: string;
};

export type RequestCodePayload = {
  email: string;
};

export type ValidateCodePayload = {
  code: string;
};

export type ResetPasswordPayload = {
  password: string;
};

// ============== USER ==============
export type UserCreatePayload = {
  name: string;
  email: string;
  password: string;
  group: string;
};

export type UserUpdatePayload = {
  _id: string;
  name?: string;
  email?: string;
  password?: string;
  group?: string;
  status?: ValueOf<typeof E_USER_STATUS>;
};

// ============== USER GROUP ==============
export type UserGroupCreatePayload = {
  name: string;
  description?: string | null;
  permissions: Array<string>;
};

export type UserGroupUpdatePayload = {
  _id: string;
  name?: string;
  description?: string | null;
  permissions?: Array<string>;
};

// ============== MENU ==============
export type MenuExtensionRefPayload = {
  pkg: string;
  extensionId: string;
};

export type MenuCreatePayload = {
  name: string;
  type: ValueOf<typeof E_MENU_ITEM_TYPE>;
  table?: string | null;
  parent?: string | null;
  html?: string | null;
  url?: string | null;
  icon?: string | null;
  order?: number;
  isInitial?: boolean;
  extension?: MenuExtensionRefPayload | null;
};

export type MenuUpdatePayload = {
  _id: string;
  name?: string;
  type?: ValueOf<typeof E_MENU_ITEM_TYPE>;
  table?: string | null;
  parent?: string | null;
  html?: string | null;
  url?: string | null;
  icon?: string | null;
  order?: number;
  isInitial?: boolean;
  extension?: MenuExtensionRefPayload | null;
};

export type MenuReorderPayload = {
  items: Array<{
    _id: string;
    parent: string | null;
    order: number;
  }>;
};

// ============== TABLE ==============
export type TableCreatePayload = {
  name: string;
  slug?: string;
  owner?: string;
  logo?: string | null;
  style?: ValueOf<typeof E_TABLE_STYLE>;
  visibility?: ValueOf<typeof E_TABLE_VISIBILITY>;
};

export type TableMethodPayload = {
  onLoad?: { code: string | null };
  beforeSave?: { code: string | null };
  afterSave?: { code: string | null };
};

export type TableUpdatePayload = {
  routeSlug: string;
  slug?: string;
  name?: string;
  description?: string | null;
  logo?: string | null;
  style?: ValueOf<typeof E_TABLE_STYLE>;
  visibility?: ValueOf<typeof E_TABLE_VISIBILITY>;
  collaboration?: ValueOf<typeof E_TABLE_COLLABORATION>;
  administrators?: Array<string>;
  fieldOrderList?: Array<string>;
  fieldOrderForm?: Array<string>;
  fieldOrderFilter?: Array<string>;
  fieldOrderDetail?: Array<string>;
  methods?: TableMethodPayload;
  order?: { field: string; direction: 'asc' | 'desc' } | null;
  fields?: Array<string>;
  groups?: Array<{
    slug: string;
    name: string;
    fields: Array<{ _id: string }>;
    _schema: Record<string, unknown>;
  }>;
  layoutFields?: {
    title: string | null;
    description: string | null;
    cover: string | null;
    category: string | null;
    startDate: string | null;
    endDate: string | null;
    color: string | null;
    participants: string | null;
    reminder: string | null;
  };
};

// ============== FIELD ==============
export type FieldConfigurationPayload = {
  required?: boolean;
  multiple?: boolean;
  format?: ValueOf<typeof E_FIELD_FORMAT> | null;
  showInFilter?: boolean;
  showInForm?: boolean;
  showInDetail?: boolean;
  showInList?: boolean;
  widthInForm?: number | null;
  widthInList?: number | null;
  tip?: string | null;
  defaultValue?: string | Array<string> | null;
  relationship?: {
    table: { _id: string; slug: string };
    field: { _id: string; slug: string };
    order: 'asc' | 'desc';
    customLabel?: boolean;
    labelParts?: Array<{ path: string; label?: string }>;
    labelSeparator?: string;
  } | null;
  dropdown?: Array<string>;
  allowCustomDropdownOptions?: boolean;
  allowCreateRelationshipRecords?: boolean;
  category?: Array<{ id: string; label: string; children: Array<unknown> }>;
  group?: { _id: string; slug: string } | null;
};

export type FieldCreatePayload = {
  slug: string;
  name: string;
  type: ValueOf<typeof E_FIELD_TYPE>;
  required?: boolean;
  multiple?: boolean;
  format?: ValueOf<typeof E_FIELD_FORMAT> | null;
  showInFilter?: boolean;
  showInForm?: boolean;
  showInDetail?: boolean;
  showInList?: boolean;
  widthInForm?: number | null;
  widthInList?: number | null;
  tip?: string | null;
  defaultValue?: string | Array<string> | null;
  relationship?: {
    table: { _id: string; slug: string };
    field: { _id: string; slug: string };
    order: 'asc' | 'desc';
    customLabel?: boolean;
    labelParts?: Array<{ path: string; label?: string }>;
    labelSeparator?: string;
  } | null;
  dropdown?: Array<string>;
  allowCustomDropdownOptions?: boolean;
  allowCreateRelationshipRecords?: boolean;
  category?: Array<{ id: string; label: string; children: Array<unknown> }>;
  group?: { _id: string; slug: string } | null;
};

export type FieldUpdatePayload = {
  slug: string;
  _id: string;
  name: string;
  type: ValueOf<typeof E_FIELD_TYPE>;
  required?: boolean;
  multiple?: boolean;
  format?: ValueOf<typeof E_FIELD_FORMAT> | null;
  showInFilter?: boolean;
  showInForm?: boolean;
  showInDetail?: boolean;
  showInList?: boolean;
  widthInForm?: number | null;
  widthInList?: number | null;
  tip?: string | null;
  defaultValue?: string | Array<string> | null;
  relationship?: {
    table: { _id: string; slug: string };
    field: { _id: string; slug: string };
    order: 'asc' | 'desc';
    customLabel?: boolean;
    labelParts?: Array<{ path: string; label?: string }>;
    labelSeparator?: string;
  } | null;
  dropdown?: Array<string>;
  allowCustomDropdownOptions?: boolean;
  allowCreateRelationshipRecords?: boolean;
  category?: Array<{ id: string; label: string; children: Array<unknown> }>;
  group?: { _id: string; slug: string } | null;
  trashed?: boolean;
  trashedAt?: string | null;
};

// ============== ROW ==============
export type RowCreatePayload = {
  slug: string;
  data: Record<string, unknown>;
};

export type RowUpdatePayload = {
  slug: string;
  rowId: string;
  data: Record<string, unknown>;
};

export type RowAutoSavePayload = {
  slug: string;
  rowId?: string;
  data: Record<string, unknown>;
};

export type RowBulkUpdatePayload = {
  slug: string;
  ids: Array<string>;
  data: Record<string, unknown>;
};

// ============== PROFILE ==============
export type ProfileUpdatePayload = {
  name: string;
  email: string;
  allowPasswordChange?: boolean;
  currentPassword?: string;
  newPassword?: string;
};

// ============== SETTING ==============
export type SettingUpdatePayload = Partial<{
  SYSTEM_NAME: string;
  SYSTEM_DESCRIPTION: string;
  LOCALE: string;
  STORAGE_DRIVER: 'local' | 's3';
  STORAGE_ENDPOINT: string;
  STORAGE_REGION: string;
  STORAGE_BUCKET: string;
  STORAGE_ACCESS_KEY: string;
  STORAGE_SECRET_KEY: string;
  FILE_UPLOAD_MAX_SIZE: number;
  FILE_UPLOAD_ACCEPTED: string;
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: number;
  PAGINATION_PER_PAGE: number;
  LOGO_SMALL_URL: string;
  LOGO_LARGE_URL: string;
  MODEL_CLONE_TABLES: Array<string>;
  EMAIL_PROVIDER_HOST: string | null;
  EMAIL_PROVIDER_PORT: number | null;
  EMAIL_PROVIDER_USER: string | null;
  EMAIL_PROVIDER_PASSWORD: string | null;
  EMAIL_PROVIDER_FROM: string | null;
  OPENAI_API_KEY: string;
  AI_ASSISTANT_ENABLED: boolean;
  CHAT_HISTORY_ENABLED: boolean;
  MCP_SERVER_URL: string | null;
  MCP_SERVER_TOKEN: string | null;
  MCP_LOWCODE_API_URL: string | null;
  OPENAI_MODEL: string;
  AI_LLM_PROVIDER: string;
  LLM_API_KEY: string | null;
  LLM_MODEL: string;
  LLM_BASE_URL: string | null;
}>;

// ============== SETUP WIZARD ==============
export type SetupAdminPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type SetupNamePayload = {
  SYSTEM_NAME: string;
  LOCALE: string;
};

export type SetupStoragePayload = {
  STORAGE_DRIVER: 'local' | 's3';
  STORAGE_ENDPOINT?: string;
  STORAGE_REGION?: string;
  STORAGE_BUCKET?: string;
  STORAGE_ACCESS_KEY?: string;
  STORAGE_SECRET_KEY?: string;
};

export type SetupLogosPayload = {
  LOGO_SMALL_URL: string | null;
  LOGO_LARGE_URL: string | null;
};

export type SetupUploadPayload = {
  FILE_UPLOAD_MAX_SIZE: number;
  FILE_UPLOAD_ACCEPTED: string;
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: number;
};

export type SetupPagingPayload = {
  PAGINATION_PER_PAGE: number;
  MODEL_CLONE_TABLES?: Array<string>;
};

export type SetupEmailPayload = {
  EMAIL_PROVIDER_HOST?: string | null;
  EMAIL_PROVIDER_PORT?: number | null;
  EMAIL_PROVIDER_USER?: string | null;
  EMAIL_PROVIDER_PASSWORD?: string | null;
  EMAIL_PROVIDER_FROM?: string | null;
};

// ============== CLONE TABLE ==============
export type CloneTablePayload = {
  baseTableId?: string;
  baseTableIds?: Array<string>;
  copyDataTableIds?: Array<string>;
  name?: string;
};

// ============== REACTION ==============
export type ReactionCreatePayload = {
  type: ValueOf<typeof E_REACTION_TYPE>;
};

// ============== EVALUATION ==============
export type EvaluationCreatePayload = {
  value: number;
};

// ============== QUERY PAYLOADS ==============
export type BaseQueryPayload = {
  page?: number;
  perPage?: number;
  search?: string;
  authenticated?: string;
};

export type UserQueryPayload = Merge<
  BaseQueryPayload,
  {
    user?: { _id: string; role: ValueOf<typeof E_ROLE> };
    _ids?: Array<string>;
    status?: ValueOf<typeof E_USER_STATUS>;
    // Contexto da consulta; passar `E_ROLE.ADMINISTRATOR` pede ao backend
    // aplicar as regras de escopo do admin (esconder MASTER).
    role?: ValueOf<typeof E_ROLE>;
    trashed?: boolean;
    'order-name'?: 'asc' | 'desc';
    'order-email'?: 'asc' | 'desc';
    'order-group'?: 'asc' | 'desc';
    'order-status'?: 'asc' | 'desc';
    'order-created-at'?: 'asc' | 'desc';
  }
>;

export type UserGroupQueryPayload = Merge<
  BaseQueryPayload,
  {
    'order-name'?: 'asc' | 'desc';
    'order-description'?: 'asc' | 'desc';
    'order-created-at'?: 'asc' | 'desc';
  }
>;

export type MenuQueryPayload = Merge<
  BaseQueryPayload,
  {
    trashed?: boolean;
    parent?: string | null;
    'order-name'?: 'asc' | 'desc';
    'order-position'?: 'asc' | 'desc';
    'order-slug'?: 'asc' | 'desc';
    'order-type'?: 'asc' | 'desc';
    'order-created-at'?: 'asc' | 'desc';
    'order-owner'?: 'asc' | 'desc';
  }
>;

export type TableQueryPayload = Merge<
  BaseQueryPayload,
  {
    name?: string;
    type?: ValueOf<typeof E_TABLE_TYPE>;
    owner?: string;
    trashed?: boolean;
    _ids?: Array<string>;
  }
>;

export type FieldQueryPayload = Merge<
  BaseQueryPayload,
  {
    type?: ValueOf<typeof E_FIELD_TYPE>;
    _ids?: Array<string>;
  }
>;

export type StorageQueryPayload = Merge<
  BaseQueryPayload,
  {
    type?: string;
  }
>;

export type LoggerQueryPayload = Merge<
  BaseQueryPayload,
  {
    actions?:
      | ValueOf<typeof E_LOGGER_ACTION_TYPE>
      | Array<ValueOf<typeof E_LOGGER_ACTION_TYPE>>
      | string;
    objects?:
      | ValueOf<typeof E_LOGGER_OBJECT_TYPE>
      | Array<ValueOf<typeof E_LOGGER_OBJECT_TYPE>>
      | string;
    'date-from'?: string;
    'date-to'?: string;
    'order-created-at'?: 'asc' | 'desc';
    'order-user'?: 'asc' | 'desc';
    'order-action'?: 'asc' | 'desc';
    'order-object'?: 'asc' | 'desc';
    'order-object-id'?: 'asc' | 'desc';
    'order-url'?: 'asc' | 'desc';
  }
>;

// ============== FIND BY PAYLOADS ==============
export type UserFindByPayload = {
  _id?: string;
  email?: string;
  exact: boolean;
};

export type MenuFindByPayload = {
  _id?: string;
  slug?: string;
  parent?: string;
  trashed?: boolean;
  exact: boolean;
};

export type TableFindByPayload = {
  _id?: string;
  slug?: string;
  exact: boolean;
};

export type FieldFindByPayload = {
  _id?: string;
  slug?: string;
  exact: boolean;
};

// ============== ROW ACTION PAYLOADS ==============
export type RowActionPayload = {
  slug: string;
  rowId: string;
};

export type RowActionBasePayload = {
  tableSlug: string;
  rowId: string;
};

export type RowReactionPayload = Merge<
  RowActionBasePayload,
  {
    field: string;
    type: ValueOf<typeof E_REACTION_TYPE>;
  }
>;

export type RowEvaluationPayload = Merge<
  RowActionBasePayload,
  {
    field: string;
    value: number;
  }
>;

// ============== EXTENSIONS ==============
export type ExtensionTogglePayload = {
  _id: string;
  enabled: boolean;
};

export type ExtensionConfigureTableScopePayload = {
  _id: string;
  mode: 'all' | 'specific';
  tableIds: Array<string>;
};
