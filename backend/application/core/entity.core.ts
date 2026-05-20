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
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type Merge<T, U> = {
  [K in keyof (T & U)]: (T & U)[K];
};

export type ValueOf<T> = T[keyof T];

export type FindOptions = { trashed?: boolean };

export const E_TOKEN_STATUS = {
  REQUESTED: 'REQUESTED',
  EXPIRED: 'EXPIRED',
  VALIDATED: 'VALIDATED',
} as const;

export const E_FIELD_TYPE = {
  TEXT_SHORT: 'TEXT_SHORT',
  TEXT_LONG: 'TEXT_LONG',
  DROPDOWN: 'DROPDOWN',
  DATE: 'DATE',
  RELATIONSHIP: 'RELATIONSHIP',
  FILE: 'FILE',
  FIELD_GROUP: 'FIELD_GROUP',
  REACTION: 'REACTION',
  EVALUATION: 'EVALUATION',
  CATEGORY: 'CATEGORY',
  USER: 'USER',

  // NATIVE
  CREATOR: 'CREATOR',
  IDENTIFIER: 'IDENTIFIER',
  CREATED_AT: 'CREATED_AT',
  TRASHED: 'TRASHED',
  TRASHED_AT: 'TRASHED_AT',
} as const;

export const E_FIELD_FORMAT = {
  // TEXT_SHORT
  ALPHA_NUMERIC: 'ALPHA_NUMERIC',
  INTEGER: 'INTEGER',
  DECIMAL: 'DECIMAL',
  URL: 'URL',
  EMAIL: 'EMAIL',
  PASSWORD: 'PASSWORD',
  PHONE: 'PHONE',
  CNPJ: 'CNPJ',
  CPF: 'CPF',

  // TEXT_LONG
  RICH_TEXT: 'RICH_TEXT',
  PLAIN_TEXT: 'PLAIN_TEXT',

  // DATE
  DD_MM_YYYY: 'dd/MM/yyyy',
  MM_DD_YYYY: 'MM/dd/yyyy',
  YYYY_MM_DD: 'yyyy/MM/dd',
  DD_MM_YYYY_HH_MM_SS: 'dd/MM/yyyy HH:mm:ss',
  MM_DD_YYYY_HH_MM_SS: 'MM/dd/yyyy HH:mm:ss',
  YYYY_MM_DD_HH_MM_SS: 'yyyy/MM/dd HH:mm:ss',
  DD_MM_YYYY_DASH: 'dd-MM-yyyy',
  MM_DD_YYYY_DASH: 'MM-dd-yyyy',
  YYYY_MM_DD_DASH: 'yyyy-MM-dd',
  DD_MM_YYYY_HH_MM_SS_DASH: 'dd-MM-yyyy HH:mm:ss',
  MM_DD_YYYY_HH_MM_SS_DASH: 'MM-dd-yyyy HH:mm:ss',
  YYYY_MM_DD_HH_MM_SS_DASH: 'yyyy-MM-dd HH:mm:ss',
} as const;

export const E_ROLE = {
  MASTER: 'MASTER',
  ADMINISTRATOR: 'ADMINISTRATOR',
  MANAGER: 'MANAGER',
  REGISTERED: 'REGISTERED',
} as const;

export const E_MENU_ITEM_TYPE = {
  TABLE: 'TABLE',
  PAGE: 'PAGE',
  FORM: 'FORM',
  EXTERNAL: 'EXTERNAL',
  SEPARATOR: 'SEPARATOR',
} as const;

export const E_TABLE_TYPE = {
  TABLE: 'TABLE',
  FIELD_GROUP: 'FIELD_GROUP',
} as const;

export const E_TABLE_STYLE = {
  LIST: 'LIST',
  GALLERY: 'GALLERY',
  DOCUMENT: 'DOCUMENT',
  CARD: 'CARD',
  MOSAIC: 'MOSAIC',
  KANBAN: 'KANBAN',
  FORUM: 'FORUM',
  CALENDAR: 'CALENDAR',
  GANTT: 'GANTT',
} as const;

export const E_TABLE_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  RESTRICTED: 'RESTRICTED',
  OPEN: 'OPEN',
  FORM: 'FORM',
  PRIVATE: 'PRIVATE',
} as const;

export const E_TABLE_COLLABORATION = {
  OPEN: 'OPEN',
  RESTRICTED: 'RESTRICTED',
} as const;

export const E_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  SIGILOSO: 'SIGILOSO',
} as const;

export const E_JWT_TYPE = {
  ACCESS: 'ACCESS',
  REFRESH: 'REFRESH',
} as const;

export const E_CHAT_EVENT = {
  STATUS: 'status',
  READY: 'ready',
  THINKING: 'thinking',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  TOOL_ERROR: 'tool_error',
  MESSAGE: 'message',
  ERROR: 'error',
} as const;

export type IJWTPayload = {
  sub: string;
  email: string;
  role: ValueOf<typeof E_ROLE>;
  type: ValueOf<typeof E_JWT_TYPE>;
};

export type Base = {
  _id: string;
  createdAt: Date;
  updatedAt: Date | null;
  trashedAt: Date | null;
  trashed: boolean;
};

export type IValidationToken = Merge<
  Base,
  {
    user: IUser;
    code: string;
    status: ValueOf<typeof E_TOKEN_STATUS>;
  }
>;

export const E_STORAGE_LOCATION = {
  LOCAL: 'local',
  S3: 's3',
} as const;

export const E_STORAGE_MIGRATION_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  FAILED: 'failed',
} as const;

export type TStorageLocation = ValueOf<typeof E_STORAGE_LOCATION>;
export type TStorageMigrationStatus = ValueOf<
  typeof E_STORAGE_MIGRATION_STATUS
>;

export type IStorage = Merge<
  Base,
  {
    url: string;
    filename: string;
    mimetype: string;
    originalName: string;
    size: number;
    location: TStorageLocation;
    migration_status: TStorageMigrationStatus;
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
    permissions: IPermission[];
  }
>;

export const E_USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

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

// MANTER SEM PADRÃO UPPERCASE POIS MAPEIA AS CHAVE <- VALOR PARA MONGOOSE
export const E_SCHEMA_TYPE = {
  NUMBER: 'Number',
  STRING: 'String',
  DATE: 'Date',
  BOOLEAN: 'Boolean',
  OBJECT_ID: 'ObjectId',
} as const;

export type ISchema = {
  type: ValueOf<typeof E_SCHEMA_TYPE>;
  required?: boolean;
  ref?: string;
  default?: string | number | boolean | null;
};

export type IEmbeddedSchema = {
  type: 'Embedded';
  schema: ITableSchema;
  required: boolean;
};

export type ITableSchema = Record<
  string,
  ISchema | ISchema[] | IEmbeddedSchema[]
>;

export type IGroupConfiguration = {
  slug: string;
  name: string;
  fields: IField[];
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
    fields: IField[];
    type: ValueOf<typeof E_TABLE_TYPE>;
    style: ValueOf<typeof E_TABLE_STYLE>;
    visibility: ValueOf<typeof E_TABLE_VISIBILITY>;
    collaboration: ValueOf<typeof E_TABLE_COLLABORATION>;
    administrators: IUser[];
    owner: IUser;
    fieldOrderList: string[];
    fieldOrderForm: string[];
    fieldOrderFilter: string[];
    fieldOrderDetail: string[];
    methods: ITableMethod;
    groups: IGroupConfiguration[];
    order: { field: string; direction: 'asc' | 'desc' } | null;
    layoutFields: ILayoutFields;
  }
>;

export type ICategory = {
  id: string;
  label: string;
  children: unknown[];
};

export type IDropdown = {
  id: string;
  label: string;
  color?: string | null;
};

export type IFieldConfigurationRelationship = {
  table: Pick<ITable, '_id' | 'slug'>;
  field: Pick<IField, '_id' | 'slug'>;
  order: 'asc' | 'desc';
};

export type IFieldConfigurationGroup = {
  _id?: string;
  slug: string;
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
    defaultValue: string | string[] | null;
    locked?: boolean;
    native?: boolean;
    relationship: IFieldConfigurationRelationship | null;
    dropdown: IDropdown[];
    allowCustomDropdownOptions?: boolean;
    category: ICategory[];
    group: IFieldConfigurationGroup | null;
  }
>;

export type FieldCreatePayload = Pick<
  IField,
  | 'name'
  | 'slug'
  | 'type'
  | 'required'
  | 'multiple'
  | 'format'
  | 'showInFilter'
  | 'showInForm'
  | 'showInDetail'
  | 'showInList'
  | 'widthInForm'
  | 'widthInList'
  | 'widthInDetail'
  | 'locked'
  | 'native'
  | 'defaultValue'
  | 'relationship'
  | 'dropdown'
  | 'allowCustomDropdownOptions'
  | 'category'
  | 'group'
>;

export type IRow = Merge<Base, Record<string, unknown>>;

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
  accepted: string[];
  rejected: string[];
  envelope: {
    from: string;
    to: string[];
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

export type IMeta = {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  firstPage: number;
};

export type Paginated<Entity> = {
  data: Entity[];
  meta: IMeta;
};

export const E_REACTION_TYPE = {
  LIKE: 'LIKE',
  UNLIKE: 'UNLIKE',
} as const;

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

export type IMenu = Merge<
  Base,
  {
    name: string;
    slug: string;
    type: ValueOf<typeof E_MENU_ITEM_TYPE>;
    table: string | null;
    parent: string | null;
    url: string | null;
    html: string | null;
    owner: IUser | string | null;
    order: number;
    isInitial: boolean;
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
  FILE_UPLOAD_MAX_SIZE: number;
  FILE_UPLOAD_ACCEPTED: string;
  FILE_UPLOAD_MAX_FILES_PER_UPLOAD: number;
  PAGINATION_PER_PAGE: number;
  MODEL_CLONE_TABLES: ITable[];
  LOGO_SMALL_URL?: string | null;
  LOGO_LARGE_URL?: string | null;
  EMAIL_PROVIDER_HOST: string | null;
  EMAIL_PROVIDER_PORT: number | null;
  EMAIL_PROVIDER_USER: string | null;
  EMAIL_PROVIDER_PASSWORD: string | null;
  EMAIL_PROVIDER_FROM: string | null;
  OPENAI_API_KEY: string | null;
  AI_ASSISTANT_ENABLED: boolean;
  SETUP_COMPLETED: boolean;
  SETUP_CURRENT_STEP:
    | 'admin'
    | 'name'
    | 'storage'
    | 'logos'
    | 'upload'
    | 'paging'
    | 'email'
    | null;
  MIGRATION_DUAL_CONNECTION_AT: Date | null;
  MIGRATION_DUAL_CONNECTION_DROPPED_AT: Date | null;
  MIGRATION_STORAGE_LOCATION_AT: Date | null;
  STORAGE_MIGRATION_LAST_RUN_AT: Date | null;
};

export const E_EXTENSION_TYPE = {
  PLUGIN: 'PLUGIN',
  MODULE: 'MODULE',
  TOOL: 'TOOL',
} as const;

export type IExtensionTableScope = {
  mode: 'all' | 'specific';
  tableIds: string[];
};

export type IExtensionRequires = {
  lowcodejs?: string;
  extensions?: string[];
};

export type IExtension = Merge<
  Base,
  {
    /** Pacote ao qual a extensão pertence (ex: "core", "marcos-pdf-tools"). */
    pkg: string;
    type: ValueOf<typeof E_EXTENSION_TYPE>;
    /** Identificador único dentro de (pkg, type). */
    extensionId: string;
    name: string;
    description: string | null;
    version: string;
    author: string | null;
    icon: string | null;
    image: string | null;
    /** Slot do placement. Apenas para PLUGIN. */
    slot: string | null;
    /** URL default do módulo. Apenas para MODULE. */
    route: string | null;
    /** Sub-grupo no menu Ferramentas. Apenas para TOOL. */
    submenu: string | null;
    enabled: boolean;
    /** False se o manifesto não existe mais no disco no boot atual. */
    available: boolean;
    /** Configuração de escopo por tabela (relevante para PLUGIN). */
    tableScope: IExtensionTableScope;
    /** Manifesto completo, para auditoria/diagnóstico. */
    manifestSnapshot: Record<string, unknown>;
    requires: IExtensionRequires;
  }
>;

export const E_TABLE_PERMISSION = {
  // TABLE
  CREATE_TABLE: 'CREATE_TABLE',
  UPDATE_TABLE: 'UPDATE_TABLE',
  REMOVE_TABLE: 'REMOVE_TABLE',
  VIEW_TABLE: 'VIEW_TABLE',

  // FIELD
  CREATE_FIELD: 'CREATE_FIELD',
  UPDATE_FIELD: 'UPDATE_FIELD',
  REMOVE_FIELD: 'REMOVE_FIELD',
  VIEW_FIELD: 'VIEW_FIELD',

  // ROW
  CREATE_ROW: 'CREATE_ROW',
  UPDATE_ROW: 'UPDATE_ROW',
  REMOVE_ROW: 'REMOVE_ROW',
  VIEW_ROW: 'VIEW_ROW',
} as const;

export const FIELD_NATIVE_LIST: FieldCreatePayload[] = [
  {
    name: 'ID',
    slug: '_id',
    type: E_FIELD_TYPE.IDENTIFIER,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInList: false,
    showInFilter: false,
    showInForm: false,
    showInDetail: false,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
  {
    name: 'Criador',
    slug: 'creator',
    type: E_FIELD_TYPE.CREATOR,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInList: true,
    showInFilter: true,
    showInForm: false,
    showInDetail: true,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
  {
    name: 'Criado em',
    slug: 'createdAt',
    type: E_FIELD_TYPE.CREATED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
    showInList: true,
    showInFilter: true,
    showInForm: false,
    showInDetail: true,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
  {
    name: 'Lixeira',
    slug: 'trashed',
    type: E_FIELD_TYPE.TRASHED,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInList: false,
    showInFilter: false,
    showInForm: false,
    showInDetail: false,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
  {
    name: 'Enviado para lixeira em',
    slug: 'trashedAt',
    type: E_FIELD_TYPE.TRASHED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInList: false,
    showInFilter: false,
    showInForm: false,
    showInDetail: false,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
];

export const FIELD_GROUP_NATIVE_LIST: FieldCreatePayload[] = [
  {
    name: 'ID',
    slug: '_id',
    type: E_FIELD_TYPE.IDENTIFIER,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInList: false,
    showInFilter: false,
    showInForm: false,
    showInDetail: false,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
  {
    name: 'Criador',
    slug: 'creator',
    type: E_FIELD_TYPE.CREATOR,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInList: true,
    showInFilter: true,
    showInForm: false,
    showInDetail: true,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
  {
    name: 'Criado em',
    slug: 'createdAt',
    type: E_FIELD_TYPE.CREATED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
    showInList: true,
    showInFilter: true,
    showInForm: false,
    showInDetail: true,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
  {
    name: 'Lixeira',
    slug: 'trashed',
    type: E_FIELD_TYPE.TRASHED,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInList: false,
    showInFilter: false,
    showInForm: false,
    showInDetail: false,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
  {
    name: 'Enviado para lixeira em',
    slug: 'trashedAt',
    type: E_FIELD_TYPE.TRASHED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInList: false,
    showInFilter: false,
    showInForm: false,
    showInDetail: false,
    widthInForm: null,
    widthInList: 10,
    widthInDetail: null,
    defaultValue: null,
    relationship: null,
    dropdown: [],
    category: [],
    group: null,
  },
];
