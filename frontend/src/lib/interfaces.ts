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
  E_FIELD_VALIDATION,
  E_JWT_TYPE,
  E_LOGGER_ACTION_TYPE,
  E_LOGGER_OBJECT_TYPE,
  E_MENU_ITEM_TYPE,
  E_NOTIFICATION_TYPE,
  E_PERMISSION_TARGET,
  E_REACTION_TYPE,
  E_ROLE,
  E_ROW_STATUS,
  E_TABLE_PERMISSION,
  E_TABLE_PROFILE,
  E_TABLE_STYLE,
  E_TABLE_TYPE,
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
    // IDs dos grupos englobados (quem pertence a este grupo herda o acesso deles).
    encompasses: Array<string>;
  }
>;

export type IUser = Merge<
  Base,
  {
    name: string;
    email: string;
    password: string;
    status: ValueOf<typeof E_USER_STATUS>;
    // Grupo principal (define o papel no sistema).
    group: IGroup;
    // Grupos adicionais do usuario (multi-grupo).
    groups: Array<IGroup>;
    // Capacidades de area resolvidas pelo backend (fecho de grupos): slugs de
    // permissao (MANAGE_*) usados para liberar a navegacao por capability.
    capabilities?: Array<string>;
    notificationsEnabled: boolean;
  }
>;

export type IAuthenticationAccounts = {
  activeAccountId: string | null;
  accounts: Array<IUser>;
};

export type INotificationAction = {
  type: 'route' | 'url';
  href: string;
  label?: string | null;
} | null;

export type INotificationSource = {
  pkg?: string | null;
  tableSlug?: string | null;
  rowId?: string | null;
  anchorId?: string | null;
} | null;

export type INotification = Merge<
  Base,
  {
    userId: string;
    type: ValueOf<typeof E_NOTIFICATION_TYPE>;
    title: string;
    body: string | null;
    action: INotificationAction;
    source: INotificationSource;
    actorUserId: string | null;
    read: boolean;
    readAt: string | null;
  }
>;

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

export type IMenuExtensionRef = {
  pkg: string;
  extensionId: string;
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
    icon: string | null;
    owner: IUser | null;
    order: number;
    isInitial: boolean;
    extension: IMenuExtensionRef | null;
    // Visibilidade da opção (Grupo|Public|Nobody). null em menus legados.
    visibility?: IPermissionBinding | null;
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
  /** Slug do campo usado para ordenar os cards desta lista no Kanban. */
  sortField?: string | null;
  /** Direção da ordenação dos cards desta lista no Kanban. */
  sortDirection?: 'asc' | 'desc' | null;
};

export type IRelationshipLabelPart = {
  /**
   * Caminho separado por pontos, relativo à tabela relacionada.
   * Ex: "nome", "categoria.nome", "fornecedor.cidade.uf".
   */
  path: string;
  /** Rótulo amigável do caminho (para exibição na UI de configuração). */
  label?: string;
};

export type IFieldConfigurationRelationship = {
  table: Pick<ITable, '_id' | 'slug'>;
  field: Pick<IField, '_id' | 'slug'>;
  order: 'asc' | 'desc';
  /**
   * Quando true, o label das opções é composto por `labelParts` + `labelSeparator`.
   * Quando false/ausente, mantém o comportamento legado (label = `field.slug`).
   */
  customLabel?: boolean;
  /** Lista ordenada de caminhos que compõem o label customizado. */
  labelParts?: Array<IRelationshipLabelPart>;
  /** Separador usado entre os `labelParts`. Default: " - ". */
  labelSeparator?: string;
  visible?: boolean;
  onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  mirror?: { multiple: boolean; visible: boolean; label?: string };
  /** Back-pointer para a RelationshipDefinition (fonte de verdade do vínculo). */
  relationshipId?: string | null;
  /**
   * Lado da definition que este campo representa. A tela de detalhe usa para
   * chamar os endpoints `/links` com o `side` correto.
   */
  side?: 'source' | 'target' | null;
  /**
   * Como o relacionamento aparece no formulário: `select` (multi-select de
   * vínculo direto) ou `manage` (tabelas internas / cards + Sheet). Ausência =
   * `select`.
   */
  formMode?: 'select' | 'manage';
  /** Limite numérico de vínculos neste lado. null = ilimitado. */
  max?: number | null;
};

/** Vínculo entre dois registros (pivô) gerido pelos endpoints `/links`. */
export type IRelationshipLink = {
  _id: string;
  relationshipId: string;
  sourceId: string;
  targetId: string;
  order: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type IFieldConfigurationGroup = {
  _id?: string;
  slug: string;
  fields?: Array<IField>;
};

// Uma regra de validação configurada num campo. `config` carrega os parâmetros
// (IS_IN_RANGE → { min, max }; IS_NOT → { values }); regras sem parâmetro = {}.
export type IFieldValidation = {
  rule: ValueOf<typeof E_FIELD_VALIDATION>;
  config: Record<string, unknown>;
};

export type IFieldLabel = {
  list: string | null;
  filter: string | null;
  form: string | null;
  detail: string | null;
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
    // Regras de validação de valor do campo (camada única de validação).
    // Opcional no tipo; em runtime sempre presente ([] por default).
    validations?: Array<IFieldValidation>;
    // Exibe o campo na barra de filtros (config de UX, não é permissão).
    showInFilter: boolean;
    // Visibilidade do campo por contexto (Grupo|Public|Nobody). null apenas em
    // documentos ainda não backfillados.
    permissions?: {
      list: IPermissionBinding;
      form: IPermissionBinding;
      detail: IPermissionBinding;
    } | null;
    widthInForm: number | null;
    widthInList: number | null;
    widthInDetail: number | null;
    tip?: string | null;
    htmlContent?: string;
    defaultValue: string | Array<string> | null;
    locked?: boolean;
    native?: boolean;
    // Rotulo customizado por contexto de exibicao. `name` continua original
    // (controla o slug). Cada chave sobrescreve o name apenas naquele contexto.
    // null no objeto inteiro = sem rotulo customizado em nenhum contexto.
    label?: IFieldLabel | null;
    relationship: IFieldConfigurationRelationship | null;
    dropdown: Array<IDropdown>;
    allowCustomDropdownOptions?: boolean;
    allowCreateRelationshipRecords?: boolean;
    category: Array<ICategory>;
    group: IFieldConfigurationGroup | null;
  }
>;

export type IFilterField = Pick<
  IField,
  'slug' | 'name' | 'label' | 'type' | 'multiple'
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
  _id?: string;
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

// Vínculo de uma ação a quem pode realizá-la. `group` só é usado quando
// kind === 'GROUP'.
export type IPermissionBinding = {
  kind: ValueOf<typeof E_PERMISSION_TARGET>;
  group: string | null;
};

// Mapa ação -> binding. Parcial: tabelas legadas podem não ter o mapa.
export type ITablePermissions = Partial<
  Record<ValueOf<typeof E_TABLE_PERMISSION>, IPermissionBinding>
>;

export type ITableMember = {
  user: string;
  profile: ValueOf<typeof E_TABLE_PROFILE>;
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
    owner: IUser;
    // Cada ação aponta para um binding (Grupo|Public|Nobody). null apenas em
    // documentos ainda não backfillados.
    permissions: ITablePermissions | null;
    // Convidados da tabela e seus perfis.
    members: Array<ITableMember>;
    fieldOrderList: Array<string>;
    fieldOrderForm: Array<string>;
    fieldOrderFilter: Array<string>;
    fieldOrderDetail: Array<string>;
    methods: ITableMethod;
    groups: Array<IGroupConfiguration>;
    order: { field: string; direction: 'asc' | 'desc' } | null;
    layoutFields: ILayoutFields;
    rowSlugFieldId: string | null;
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
  LOGO_SMALL_DARK_URL: string | null;
  LOGO_LARGE_DARK_URL: string | null;
  LOGIN_BACKGROUND_URL: string | null;
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
  CHAT_HISTORY_ENABLED: boolean;
  MCP_SERVER_URL: string | null;
  MCP_SERVER_TOKEN: string | null;
  MCP_LOWCODE_API_URL: string | null;
  OPENAI_MODEL: string;
  AI_LLM_PROVIDER: string;
  LLM_API_KEY: string | null;
  LLM_MODEL: string;
  LLM_BASE_URL: string | null;
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
  Omit<Base, 'trashed'>,
  {
    creator: IUser;
    updater?: IUser | null;
    status?: ValueOf<typeof E_ROW_STATUS>;
    draftAt?: string | null;
    sharedRowSlug?: string | null;
    // Linha dinamica: os campos do low-code sao definidos em runtime, entao o
    // valor por slug e `any` por design (unica excecao sancionada de `any`).
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

export type IExtensionPermissions = {
  view: Array<string>;
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
    slots: Array<string>;
    route: string | null;
    configRoute: string | null;
    submenu: string | null;
    enabled: boolean;
    available: boolean;
    tableScope: IExtensionTableScope;
    manifestSnapshot: Record<string, unknown>;
    requires: IExtensionRequires;
    permissions: IExtensionPermissions;
    supportsScopeAll: boolean;
    tableSettings?: Record<string, Record<string, unknown>>;
  }
>;

export type ILoggerUserRef = Pick<IUser, '_id' | 'name' | 'email'>;

export type ILogger = Merge<
  Base,
  {
    url: string;
    user: ILoggerUserRef | null;
    action: ValueOf<typeof E_LOGGER_ACTION_TYPE>;
    object: ValueOf<typeof E_LOGGER_OBJECT_TYPE> | null;
    object_id: string | null;
    content: Record<string, unknown> | null;
    // Dados do registro referenciado por object_id (nao do log). Null quando o
    // objeto nao for uma ROW de tabela dinamica.
    creator: ILoggerUserRef | null;
    updater: ILoggerUserRef | null;
    objectCreatedAt: string | null;
    objectUpdatedAt: string | null;
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
