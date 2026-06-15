/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Make some property optional an type
 *
 * @example
 * ```typescript
 * type Post {
 *  id: string;
 *  name: string;
 *  email: string;
 * }
 *
 * Optional<Post, 'name' | 'email>
 * ```
 */

import type {
  E_EXTENSION_TYPE,
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  E_JWT_TYPE,
  E_MENU_ITEM_TYPE,
  E_REACTION_TYPE,
  E_ROLE,
  E_TABLE_COLLABORATION,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
  E_TABLE_VISIBILITY,
  E_TOKEN_STATUS,
  E_USER_STATUS,
} from './constant';

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type Merge<T, U> = {
  [K in keyof (T & U)]: (T & U)[K];
};

export type ValueOf<T> = T[keyof T];

export type SearchableOption = {
  value: string;
  label: string;
};

export type Meta = {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  firstPage: number;
};

export type Paginated<Entity> = {
  data: Array<Entity>;
  meta: Meta;
};

export type Base = {
  _id: string;
  createdAt: string;
  updatedAt: string | null;
  trashedAt: string | null;
  trashed: boolean;
};

export type IStorage = Merge<
  Base,
  {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
    originalName: string;
  }
>;

export type IPermission = Merge<
  Base,
  {
    name: string;
    slug: string;
    description: string | null;
  }
>;

export type IGroup = Merge<
  Base,
  {
    name: string;
    slug: string;
    description: string | null;
    permissions: Array<IPermission>;
  }
>;

export type IUser = Merge<
  Base,
  {
    name: string;
    email: string;
    password: string;
    status: ValueOf<typeof E_USER_STATUS>;
    group: IGroup;
  }
>;

export type IAuthenticationAccounts = {
  activeAccountId: string | null;
  accounts: Array<IUser>;
};

export type IValidationToken = Merge<
  Base,
  {
    user: IUser;
    code: string;
    status: ValueOf<typeof E_TOKEN_STATUS>;
  }
>;

export type IJWTPayload = {
  sub: string;
  email: string;
  role: ValueOf<typeof E_ROLE>;
  type: ValueOf<typeof E_JWT_TYPE>;
};

export type IMenu = Merge<
  Base,
  {
    name: string;
    slug: string;
    type: ValueOf<typeof E_MENU_ITEM_TYPE>;
    table: ITable | null;
    parent: IMenu | null;
    url: string | null;
    html: string | null;
    owner: IUser | null;
    order: number;
    isInitial: boolean;
    children?: Array<IMenu>;
  }
>;

export type ICategory = {
  id: string;
  label: string;
  children: Array<ICategory>;
};

export type IDropdown = {
  id: string;
  label: string;
  color: string | null;
};

export type IFieldConfigurationRelationship = {
  table: Pick<ITable, '_id' | 'slug'>;
  field: Pick<IField, '_id' | 'slug'>;
  order: 'asc' | 'desc';
};

export type IFieldConfigurationGroup = {
  slug: string;
  fields?: Array<IField>;
};

export type IField = Merge<
  Base,
  {
    name: string;
    slug: string;
    type: ValueOf<typeof E_FIELD_TYPE>;
    required: boolean;
    multiple: boolean;
    format: ValueOf<typeof E_FIELD_FORMAT> | null;
    showInFilter: boolean;
    showInForm: boolean;
    showInDetail: boolean;
    showInList: boolean;
    widthInForm: number | null;
    widthInList: number | null;
    widthInDetail: number | null;
    defaultValue: string | Array<string> | null;
    locked?: boolean;
    native?: boolean;
    relationship: IFieldConfigurationRelationship | null;
    dropdown: Array<IDropdown>;
    allowCustomDropdownOptions?: boolean;
    category: Array<ICategory>;
    group: IFieldConfigurationGroup | null;
  }
>;

export type IFilterField = Pick<
  IField,
  'slug' | 'name' | 'type' | 'multiple'
> & {
  dropdown?: Array<IDropdown>;
  category?: Array<ICategory>;
  relationship?: IFieldConfigurationRelationship | null;
};

export type ISchema = {
  type: 'Number' | 'String' | 'Date' | 'Boolean' | 'ObjectId';
  required?: boolean;
  ref?: string;
  default?: string | number | boolean | null;
};

export type ITableSchema = Record<string, ISchema | Array<ISchema>>;

export type IGroupConfiguration = {
  slug: string;
  name: string;
  fields: Array<IField>;
  _schema: ITableSchema;
};

export type ITableMethod = {
  onLoad: { code: string | null };
  beforeSave: { code: string | null };
  afterSave: { code: string | null };
};

export type ILayoutFields = {
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

export type ITable = Merge<
  Base,
  {
    _schema: ITableSchema;
    name: string;
    description: string | null;
    logo: IStorage | null;
    slug: string;
    fields: Array<IField>;
    type: ValueOf<typeof E_TABLE_TYPE>;
    style: ValueOf<typeof E_TABLE_STYLE>;
    visibility: ValueOf<typeof E_TABLE_VISIBILITY>;
    collaboration: ValueOf<typeof E_TABLE_COLLABORATION>;
    administrators: Array<IUser>;
    owner: IUser;
    fieldOrderList: Array<string>;
    fieldOrderForm: Array<string>;
    fieldOrderFilter: Array<string>;
    fieldOrderDetail: Array<string>;
    methods: ITableMethod;
    groups: Array<IGroupConfiguration>;
    order: { field: string; direction: 'asc' | 'desc' } | null;
    layoutFields: ILayoutFields;
  }
>;

export type ISetting = {
  SYSTEM_NAME: string;
  SYSTEM_DESCRIPTION: string;
  LOCALE: string;
  STORAGE_DRIVER: 'local' | 's3';
  STORAGE_ENDPOINT?: string;
  STORAGE_REGION?: string;
  STORAGE_BUCKET?: string;
  STORAGE_ACCESS_KEY?: string;
  STORAGE_SECRET_KEY?: string;
  LOGO_SMALL_URL: string | null;
  LOGO_LARGE_URL: string | null;
  FILE_UPLOAD_MAX_SIZE: number;
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: number;
  FILE_UPLOAD_ACCEPTED: Array<string>;
  PAGINATION_PER_PAGE: number;
  MODEL_CLONE_TABLES: Array<ITable>;
  DATABASE_URL: string;
  EMAIL_PROVIDER_HOST: string | null;
  EMAIL_PROVIDER_PORT: number | null;
  EMAIL_PROVIDER_USER: string | null;
  EMAIL_PROVIDER_PASSWORD: string | null;
  EMAIL_PROVIDER_FROM: string | null;
  OPENAI_API_KEY: string;
  AI_ASSISTANT_ENABLED: boolean;
  SETUP_COMPLETED: boolean;
  SETUP_CURRENT_STEP: string | null;
};

export type SetupStep =
  | 'admin'
  | 'name'
  | 'storage'
  | 'logos'
  | 'upload'
  | 'paging'
  | 'email';

export type ISetupStatus = {
  completed: boolean;
  currentStep: SetupStep | null;
  hasAdmin: boolean;
  steps: ReadonlyArray<SetupStep>;
};

// type RowResponseValue =
//   | string
//   | null
//   | Array<string>
//   | Array<IStorage>
//   | Array<IRow>
//   | Array<IUser>
//   | IUser;
// | Array<Record<string, RowResponseValue>>;

export type IRow = Merge<
  Base,
  {
    creator: IUser;
    [x: string]: any;
  }
>;

export type IAttachment = {
  filename: string;
  content: Buffer | string;
};

export type IEmailOptions = {
  from?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<IAttachment>;
};

export type ISentMessageInfo = {
  accepted: Array<string>;
  rejected: Array<string>;
  envelope: {
    from: string;
    to: Array<string>;
  };
};

export type ISearch = Merge<
  Record<string, unknown>,
  {
    page: number;
    perPage: number;
    search?: string;
    trashed?: 'true' | 'false';
    sub?: string;
  }
>;

export type IReaction = Merge<
  Base,
  {
    user: IUser;
    type: ValueOf<typeof E_REACTION_TYPE>;
  }
>;

export type IEvaluation = Merge<
  Base,
  {
    user: IUser;
    value: number;
  }
>;

export type IEvaluationSummary = {
  _average: number;
  _count: number;
  _userValue: number | null;
};

export type IReactionSummary = {
  _likeCount: number;
  _unlikeCount: number;
  _userReaction: string | null;
};

export type IHTTPException = {
  code: number;
  cause: string;
  message: string;
};

export type IHTTPExeptionError<T> = Merge<IHTTPException, { errors: T }>;

export type IExtensionTableScope = {
  mode: 'all' | 'specific';
  tableIds: Array<string>;
};

export type IExtensionRequires = {
  lowcodejs?: string;
  extensions?: Array<string>;
};

export type IExtension = Merge<
  Base,
  {
    pkg: string;
    type: ValueOf<typeof E_EXTENSION_TYPE>;
    extensionId: string;
    name: string;
    description: string | null;
    version: string;
    author: string | null;
    icon: string | null;
    image: string | null;
    slot: string | null;
    route: string | null;
    submenu: string | null;
    enabled: boolean;
    available: boolean;
    tableScope: IExtensionTableScope;
    manifestSnapshot: Record<string, unknown>;
    requires: IExtensionRequires;
    supportsScopeAll: boolean;
    category: 'restrictive' | 'permissive' | null;
    hasSettingsSchema: boolean;
    tableSettings?: Record<string, Record<string, unknown>>;
  }
>;

export interface ICloneTableResponse {
  tableId: string;
  slug: string;
  tables?: Array<{
    tableId: string;
    slug: string;
    name: string;
  }>;
  fieldIdMap: Record<string, string>;
  fieldIdMaps?: Record<string, Record<string, string>>;
}
