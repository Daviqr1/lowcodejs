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
export type Merge<T, U> = {
  // eslint-disable-next-line lowcodejs/no-type-intersection -- é a definição do próprio Merge; não há como usá-lo para defini-lo
  [K in keyof (T & U)]: (T & U)[K];
};
export type Optional<T, K extends keyof T> = Merge<
  Pick<Partial<T>, K>,
  Omit<T, K>
>;

export type ValueOf<T> = T[keyof T];

/**
 * `trashed` escolhe **um** dos dois lados (so ativos ou so lixeira).
 * `includeTrashed` desliga o filtro e devolve os dois — o que quem precisa
 * distinguir "nao existe" de "esta na lixeira" usa (ex.: exclusao definitiva,
 * que responde 404 num caso e 409 no outro).
 */
export type FindOptions = { trashed?: boolean; includeTrashed?: boolean };

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
  USER_GROUP: 'USER_GROUP',
  HTML_CONTENT: 'HTML_CONTENT',

  // NATIVE
  CREATOR: 'CREATOR',
  IDENTIFIER: 'IDENTIFIER',
  CREATED_AT: 'CREATED_AT',
  UPDATED_AT: 'UPDATED_AT',
  UPDATER: 'UPDATER',
  TRASHED_AT: 'TRASHED_AT',
  STATUS: 'STATUS',
} as const;

/**
 * Tipos nativos — criados pela plataforma, nunca escolhidos pelo usuario.
 */
export const FIELD_TYPE_NATIVE_VALUES: Array<ValueOf<typeof E_FIELD_TYPE>> = [
  E_FIELD_TYPE.CREATOR,
  E_FIELD_TYPE.IDENTIFIER,
  E_FIELD_TYPE.CREATED_AT,
  E_FIELD_TYPE.UPDATED_AT,
  E_FIELD_TYPE.UPDATER,
  E_FIELD_TYPE.TRASHED_AT,
  E_FIELD_TYPE.STATUS,
];

/**
 * Tipos que nao podem existir dentro de um FIELD_GROUP (sem aninhamento).
 */
const FIELD_TYPE_NOT_NESTABLE_VALUES: Array<ValueOf<typeof E_FIELD_TYPE>> = [
  E_FIELD_TYPE.FIELD_GROUP,
  E_FIELD_TYPE.REACTION,
  E_FIELD_TYPE.EVALUATION,
];

/**
 * Todos os tipos de campo — usar nos enums de RESPOSTA (inclui os nativos).
 * Derivado de `E_FIELD_TYPE` para que um tipo novo nunca precise ser repetido
 * a mao nos JSON Schemas do Fastify.
 */
export const FIELD_TYPE_ALL_VALUES = Object.values(E_FIELD_TYPE);

/**
 * Tipos configuraveis pelo usuario — usar nos enums de BODY (criar/editar campo).
 */
export const FIELD_TYPE_CONFIGURABLE_VALUES = FIELD_TYPE_ALL_VALUES.filter(
  (type) => !FIELD_TYPE_NATIVE_VALUES.includes(type),
);

/**
 * Tipos configuraveis dentro de um FIELD_GROUP.
 */
export const FIELD_TYPE_GROUP_CONFIGURABLE_VALUES =
  FIELD_TYPE_CONFIGURABLE_VALUES.filter(
    (type) => !FIELD_TYPE_NOT_NESTABLE_VALUES.includes(type),
  );

export const E_ROW_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
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

// Regras de validacao de valor aplicaveis a um campo. Cada chave tem uma
// subpasta em `core/validations/<regra>`. Regras puras validam no front e no
// back; as marcadas async (IS_UNIQUE, ARE_UNIQUE_VALUES, EMAIL_EXISTS,
// USER_EXISTS) consultam o banco e validam so no back (autoritativo).
export const E_FIELD_VALIDATION = {
  // Puras (sincronas)
  NOT_EMPTY: 'NOT_EMPTY',
  IS_EMAIL: 'IS_EMAIL',
  IS_NUMERIC: 'IS_NUMERIC',
  IS_ALPHA_NUMERIC: 'IS_ALPHA_NUMERIC',
  IS_IN_RANGE: 'IS_IN_RANGE',
  IS_IBAN: 'IS_IBAN',
  IS_NOT: 'IS_NOT',
  // Migradas do format (puras)
  IS_URL: 'IS_URL',
  IS_PHONE: 'IS_PHONE',
  IS_CPF: 'IS_CPF',
  IS_CNPJ: 'IS_CNPJ',
  // Async (consultam o banco)
  IS_UNIQUE: 'IS_UNIQUE',
  ARE_UNIQUE_VALUES: 'ARE_UNIQUE_VALUES',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  USER_EXISTS: 'USER_EXISTS',
} as const;

export const E_ROLE = {
  MASTER: 'MASTER',
  ADMINISTRATOR: 'ADMINISTRATOR',
  MANAGER: 'MANAGER',
  REGISTERED: 'REGISTERED',
} as const;

// Slugs dos grupos do sistema. Grupos com esses slugs nao podem ser
// editados nem removidos (protecao unica reutilizada pelos use-cases).
// Ids dos templates de tabela built-in (tool `clone-table`). Nao sao ObjectId:
// quem consome `MODEL_CLONE_TABLES` precisa distingui-los de referencias reais.
export const BUILTIN_TABLE_TEMPLATE_IDS = new Set([
  'KANBAN_TEMPLATE',
  'CARDS_TEMPLATE',
  'MOSAIC_TEMPLATE',
  'DOCUMENT_TEMPLATE',
  'FORUM_TEMPLATE',
  'CALENDAR_TEMPLATE',
]);

export const SYSTEM_GROUP_SLUGS: ReadonlySet<string> = new Set<string>([
  E_ROLE.MASTER,
  E_ROLE.ADMINISTRATOR,
  E_ROLE.MANAGER,
  E_ROLE.REGISTERED,
]);

export const E_MENU_ITEM_TYPE = {
  TABLE: 'TABLE',
  PAGE: 'PAGE',
  FORM: 'FORM',
  EXTERNAL: 'EXTERNAL',
  SEPARATOR: 'SEPARATOR',
  EXTENSION_MODULE: 'EXTENSION_MODULE',
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
  HISTORY: 'history',
  LLM_INFO: 'llm_info',
} as const;

/** Provedor de LLM do assistente IA (configurável em /settings). */
export const E_AI_LLM_PROVIDER = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  CLAUDE: 'claude',
  OPENROUTER: 'openrouter',
  OLLAMA: 'ollama',
} as const;

export const E_NOTIFICATION_TYPE = {
  FORUM_MENTION: 'FORUM_MENTION',
  KANBAN_COMMENT_MENTION: 'KANBAN_COMMENT_MENTION',
  ROW_MEMBER_ASSIGNED: 'ROW_MEMBER_ASSIGNED',
  GENERIC: 'GENERIC',
} as const;

export const E_NOTIFICATION_EVENT = {
  CREATED: 'notification:created',
  READ: 'notification:read',
  READ_ALL: 'notification:read_all',
} as const;

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

export type IJWTPayload = {
  sub: string;
  email: string;
  role: ValueOf<typeof E_ROLE>;
  type: ValueOf<typeof E_JWT_TYPE>;
  /**
   * Geracao da sessao. O middleware compara com `user.sessionVersion`: trocar
   * senha ou desativar/remover o usuario incrementa o contador e derruba os
   * tokens ja emitidos. Ausente nos tokens anteriores a este campo — vale 0.
   */
  sessionVersion?: number;
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
    // Ids dos grupos englobados (multi-link). Quem pertence a este grupo herda
    // o acesso liberado a eles (fecho transitivo). Ex.: Manager engloba
    // Registered. Mantido como ids (nao populado) — referencia, nao agregado.
    encompasses: string[];
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
    // Grupo principal: define o `role` no JWT e a compatibilidade com o RBAC
    // legado. Continua obrigatorio.
    group: IGroup;
    // Grupos adicionais: o usuario tambem pertence a estes. O acesso efetivo e
    // o fecho de `{group} ∪ groups` seguindo `encompasses`.
    groups: IGroup[];
    notificationsEnabled: boolean;
    /** Ver `IJWTPayload.sessionVersion`. */
    sessionVersion: number;
  }
>;

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
    readAt: Date | null;
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
  _id?: string;
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
    owner: IUser;
    // Cada acao aponta para um binding (Grupo|Public|Nobody). null apenas em
    // documentos ainda nao backfillados (migration 09).
    permissions: ITablePermissions | null;
    // Convidados da tabela com seu perfil (owner/admin/editor/contributor/viewer).
    members: ITableMember[];
    fieldOrderList: string[];
    fieldOrderForm: string[];
    fieldOrderFilter: string[];
    fieldOrderDetail: string[];
    methods: ITableMethod;
    groups: IGroupConfiguration[];
    order: { field: string; direction: 'asc' | 'desc' } | null;
    layoutFields: ILayoutFields;
    rowSlugFieldId: string | null;
  }
>;

export type ICategory = {
  id: string;
  label: string;
  // Arvore recursiva: cada filho e outra ICategory.
  children: ICategory[];
};

export type IDropdown = {
  id: string;
  label: string;
  color?: string | null;
  /** Slug do campo usado para ordenar os cards desta lista no Kanban. */
  sortField?: string | null;
  /** Direção da ordenação dos cards desta lista no Kanban. */
  sortDirection?: 'asc' | 'desc' | null;
};

export type IRelationshipLabelPart = {
  /**
   * Caminho separado por pontos, relativo a tabela relacionada.
   * Ex: "nome", "categoria.nome", "fornecedor.cidade.uf".
   */
  path: string;
  /** Rotulo amigavel do caminho (para exibicao na UI de configuracao). */
  label?: string;
};

export type IFieldConfigurationRelationship = {
  table: Pick<ITable, '_id' | 'slug'>;
  field: Pick<IField, '_id' | 'slug'>;
  order: 'asc' | 'desc';
  /**
   * Quando true, o label das opcoes e composto por `labelParts` + `labelSeparator`.
   * Quando false/ausente, mantem o comportamento legado (label = `field.slug`).
   */
  customLabel?: boolean;
  /** Lista ordenada de caminhos que compoem o label customizado. */
  labelParts?: IRelationshipLabelPart[];
  /** Separador usado entre os `labelParts`. Default: " - ". */
  labelSeparator?: string;
  /**
   * Mostra a tabela interna de gestao deste lado na tela de detalhe. Controle
   * de apresentacao independente de `multiple`. Default true.
   */
  visible?: boolean;
  /** Back-pointer para a RelationshipDefinition que e a fonte de verdade. */
  relationshipId?: string | null;
  /**
   * Qual lado da `RelationshipDefinition` este campo representa. Persistido para
   * a tela de detalhe saber qual `side` passar aos endpoints `/links` sem
   * precisar carregar a definition. `source` = campo declarante; `target` =
   * campo-espelho.
   */
  side?: 'source' | 'target' | null;
  /**
   * Como o relacionamento aparece no formulario: `select` (multi-select de
   * vinculo direto, padrao historico) ou `manage` (tabelas internas / cards +
   * Sheet). Ausencia = `select`.
   */
  formMode?: 'select' | 'manage';
  /**
   * Comportamento ao excluir (§9). Config do lado source na criacao/edicao do
   * campo; a fonte de verdade efetiva e `RelationshipDefinition.onDelete`.
   */
  onDelete?: ValueOf<typeof E_RELATIONSHIP_ON_DELETE>;
  /**
   * Config do lado espelho (target) coletada na tela do campo source.
   * `multiple` deriva a cardinalidade; `visible`/`label` controlam o endpoint.
   */
  mirror?: {
    multiple: boolean;
    visible: boolean;
    label?: string;
  };
  /** Limite numerico de vinculos neste lado. null = ilimitado. */
  max?: number | null;
};

export type IFieldConfigurationGroup = {
  _id?: string;
  slug: string;
};

// Visibilidade do campo por contexto: cada contexto aponta para um binding
// (Grupo|Public|Nobody). Nobody = oculto.
export type IFieldPermissions = {
  list: IPermissionBinding;
  form: IPermissionBinding;
  detail: IPermissionBinding;
};

// Rotulo customizado por contexto de exibicao do campo.
export type IFieldLabel = {
  list: string | null;
  filter: string | null;
  form: string | null;
  detail: string | null;
};

// Uma regra de validacao configurada num campo. `config` carrega os parametros
// da regra (ex.: IS_IN_RANGE → { min, max }; IS_NOT → { values }). Regras sem
// parametro usam `{}`.
export type IFieldValidation = {
  rule: ValueOf<typeof E_FIELD_VALIDATION>;
  config: Record<string, unknown>;
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
    // Regras de validacao de valor do campo (camada unica de validacao).
    // Opcional no tipo; em runtime sempre presente ([] por default do
    // mongoose/zod + migration 19).
    validations?: IFieldValidation[];
    // Exibe o campo na barra de filtros (config de UX, nao e permissao).
    showInFilter: boolean;
    // Campos-filho de FIELD_GROUP: elegibilidade de aparecer na listagem geral
    // da tabela pai. `showInParentList` (config no form) injeta o campo em
    // "Gerenciar campos" da lista principal; `visibleInParentList` (toggle em
    // Gerenciar) controla se a coluna e de fato renderizada. Nao e permissao —
    // `permissions.list` do campo-filho rege apenas a sub-tabela do grupo.
    showInParentList?: boolean;
    visibleInParentList?: boolean;
    // Visibilidade por contexto (list/form/detail). null apenas em documentos
    // ainda nao backfillados (migration 10).
    permissions?: IFieldPermissions | null;
    widthInForm: number | null;
    widthInList: number | null;
    widthInDetail: number | null;
    tip?: string | null;
    htmlContent?: string | null;
    defaultValue: string | string[] | null;
    locked?: boolean;
    native?: boolean;
    // Rotulo customizado por contexto de exibicao. `name` continua sendo o nome
    // original (controla o slug). Cada chave sobrescreve o name apenas no seu
    // contexto especifico; null em qualquer chave = usa o name. null no objeto
    // inteiro = sem rotulo customizado em nenhum contexto.
    label?: IFieldLabel | null;
    relationship: IFieldConfigurationRelationship | null;
    dropdown: IDropdown[];
    allowCustomDropdownOptions?: boolean;
    allowCreateRelationshipRecords?: boolean;
    // Campo USER: quando true, grava o usuario logado no registro caso nenhum id
    // de usuario seja enviado no payload (create e update). Ver user-self-fill.core.
    fillWithCurrentUserWhenEmpty?: boolean;
    category: ICategory[];
    group: IFieldConfigurationGroup | null;
  }
>;

// Comportamento ao excluir um registro que participa de um relacionamento.
// Semantica de delete cascade do relacional (ver spec §9).
export const E_RELATIONSHIP_ON_DELETE = {
  CASCADE: 'CASCADE',
  SET_NULL: 'SET_NULL',
  RESTRICT: 'RESTRICT',
} as const;

// Um lado do relacionamento. O campo `RELATIONSHIP` daquele lado e a fonte de
// "aceita multiplos" (field.multiple) e "obrigatorio" (field.required); aqui
// guardamos apenas o que e exclusivo do endpoint: visibilidade e rotulo.
export type IRelationshipEndpoint = {
  table: Pick<ITable, '_id' | 'slug'>;
  field: Pick<IField, '_id' | 'slug'>;
  // Mostra a tabela interna de gestao neste lado (apresentacao/interacao).
  visible: boolean;
  // Rotulo exibido na UI deste lado (independente do outro).
  label: string;
};

// Fonte de verdade do vinculo entre duas tabelas, independente delas.
export type IRelationshipDefinition = Merge<
  Base,
  {
    // Rotulo administrativo; default derivado dos dois lados ("A ↔ B").
    name: string;
    source: IRelationshipEndpoint;
    target: IRelationshipEndpoint;
    onDelete: ValueOf<typeof E_RELATIONSHIP_ON_DELETE>;
  }
>;

// Par (sourceId, targetId) na colecao de juncao (pivo). Vale para 1:1, 1:N e N:N.
export type IRelationshipLink = {
  _id: string;
  relationshipId: string;
  sourceId: string;
  targetId: string;
  // Posicao do vinculo na lista do lado multiplo.
  order: number;
  // Extensivel (papel, etc.).
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date | null;
};

// Cardinalidade derivada dos dois `field.multiple` (nao persistida).
export const E_RELATIONSHIP_CARDINALITY = {
  ONE_TO_ONE: '1:1',
  ONE_TO_MANY: '1:N',
  MANY_TO_MANY: 'N:N',
} as const;

// Papel de armazenamento de cada lado, derivado da cardinalidade + side (nao
// persistido). Modelo relacional FK-inline:
//   - OWNS_FK: grava a FK (single ObjectId) na propria row; populate nativo.
//             (lado N do 1:N; lado source do 1:1)
//   - REVERSE: nao grava nada; resolvido por query reversa na colecao do lado
//             OWNS_FK (`ownerFieldSlug == meuId`). (lado 1 do 1:N; target do 1:1)
//   - PIVOT: N:N, via colecao de juncao `RelationshipLink`.
export const E_RELATIONSHIP_STORAGE = {
  OWNS_FK: 'OWNS_FK',
  REVERSE: 'REVERSE',
  PIVOT: 'PIVOT',
} as const;

export type FieldCreatePayload = Pick<
  IField,
  | 'name'
  | 'slug'
  | 'type'
  | 'required'
  | 'multiple'
  | 'format'
  | 'validations'
  | 'showInFilter'
  | 'showInParentList'
  | 'visibleInParentList'
  | 'permissions'
  | 'widthInForm'
  | 'widthInList'
  | 'widthInDetail'
  | 'tip'
  | 'locked'
  | 'native'
  | 'label'
  | 'defaultValue'
  | 'relationship'
  | 'dropdown'
  | 'allowCustomDropdownOptions'
  | 'allowCreateRelationshipRecords'
  | 'category'
  | 'group'
>;

// Ref lean de usuario populado na resposta (creator/updater e campo USER).
export type IUserRef = Pick<IUser, '_id' | 'name' | 'email'>;

// Ref lean de grupo populado na resposta (campo USER_GROUP).
export type IGroupRef = Pick<IGroup, '_id' | 'name' | 'slug'>;

// Valor de UM campo no PAYLOAD de envio (create/update). Chaves da row sao
// dinamicas, mas o formato por tipo de campo e fechado e conhecido:
// TEXT/DATE -> string|null; DROPDOWN/CATEGORY/FILE/USER/RELATIONSHIP -> ids;
// FIELD_GROUP -> array de sub-payloads aninhados.
export type RowPayloadValue = string | null | Array<string> | Array<RowPayload>;

// Valor de UM campo na RESPOSTA. FILE volta populado (IStorage), USER volta
// lean (IUserRef), RELATIONSHIP volta a row populada, FIELD_GROUP aninhado.
export type RowResultValue =
  | string
  | null
  | Array<string>
  | Array<IStorage>
  | Array<IUserRef>
  | Array<IGroupRef>
  | Array<IRow>;

// Payload de envio: chaves dinamicas, valores tipados (substitui
// Record<string, unknown> em controller/validator/repo).
export type RowPayload = Record<string, RowPayloadValue>;

// Campos nativos da resposta de row. creator/updater sao ref User: chegam
// populados (IUserRef) na resposta, mas o BE tambem lida com o id cru antes do
// populate — por isso a uniao com string.
export type RowNative = {
  _id: string;
  status?: ValueOf<typeof E_ROW_STATUS>;
  creator?: IUserRef | string | null;
  updater?: IUserRef | string | null;
  createdAt: Date;
  updatedAt: Date | null;
  trashedAt: Date | null;
  draftAt?: Date | null;
  sharedRowSlug?: string | null;
};

// Resposta de row: nativos tipados + indice dinamico. O valor por slug segue o
// contrato de `RowResultValue`, mas o indice fica `unknown` no BACKEND porque a
// row aqui e composta com `mongoose.Document` (model-builder) e manipulada de
// forma dinamica — um indice estreito colidiria com os metodos do Document. O
// contrato forte de valor por campo vive em `RowResultValue` e no generico
// `Row<TFields>` (opt-in); no FRONTEND o indice de `IRow` e estreitado, pois la
// nao ha interop com Mongoose.
export type IRow = Merge<RowNative, { [slug: string]: unknown }>;

// Mapa tipo-de-campo -> valor na resposta (fonte unica, sem conditional type).
export type RowFieldValueMap = {
  [E_FIELD_TYPE.TEXT_SHORT]: string | null;
  [E_FIELD_TYPE.TEXT_LONG]: string | null;
  [E_FIELD_TYPE.HTML_CONTENT]: string | null;
  [E_FIELD_TYPE.DATE]: Date | string | null;
  [E_FIELD_TYPE.DROPDOWN]: Array<string>;
  [E_FIELD_TYPE.CATEGORY]: Array<string>;
  [E_FIELD_TYPE.FILE]: Array<IStorage>;
  [E_FIELD_TYPE.USER]: Array<IUserRef>;
  [E_FIELD_TYPE.USER_GROUP]: Array<IGroupRef>;
  [E_FIELD_TYPE.RELATIONSHIP]: Array<IRow>;
  [E_FIELD_TYPE.FIELD_GROUP]: Array<IRow>;
  [E_FIELD_TYPE.REACTION]: Array<string>;
  [E_FIELD_TYPE.EVALUATION]: Array<string>;
  [E_FIELD_TYPE.CREATOR]: IUserRef | string;
  [E_FIELD_TYPE.UPDATER]: IUserRef | string | null;
  [E_FIELD_TYPE.IDENTIFIER]: string;
  [E_FIELD_TYPE.CREATED_AT]: Date | string | null;
  [E_FIELD_TYPE.UPDATED_AT]: Date | string | null;
  [E_FIELD_TYPE.TRASHED_AT]: Date | string | null;
  [E_FIELD_TYPE.STATUS]: ValueOf<typeof E_ROW_STATUS>;
};

// Valor de um campo por tipo (indexed access, base do generico Row<TFields>).
export type FieldValueByType<T extends keyof RowFieldValueMap> =
  RowFieldValueMap[T];

// Row tipada por um conjunto de fields conhecido em compile-time. Opt-in: usar
// so onde ha `fields as const` (ex.: helpers de template). Nao forcar onde os
// fields vem da API em runtime.
export type Row<TFields extends ReadonlyArray<Pick<IField, 'slug' | 'type'>>> =
  Merge<
    RowNative,
    { [F in TFields[number] as F['slug']]: FieldValueByType<F['type']> }
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
    table: string | null;
    parent: string | null;
    url: string | null;
    html: string | null;
    icon: string | null;
    owner: IUser | string | null;
    order: number;
    isInitial: boolean;
    /** Referência a uma extensão (apenas para type=EXTENSION_MODULE). */
    extension: IMenuExtensionRef | null;
    // Visibilidade da opção de menu (Grupo|Public|Nobody). null em menus legados.
    visibility?: IPermissionBinding | null;
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
  // Refs das tabelas de clonagem. Sao ids (string) quando nao populado — como
  // chega no payload de update e como o double de teste guarda — e ITable apos o
  // populate do repositorio Mongoose no get.
  MODEL_CLONE_TABLES: Array<string | ITable>;
  LOGO_SMALL_URL?: string | null;
  LOGO_LARGE_URL?: string | null;
  LOGO_SMALL_DARK_URL?: string | null;
  LOGO_LARGE_DARK_URL?: string | null;
  LOGIN_BACKGROUND_URL?: string | null;
  EMAIL_PROVIDER_HOST: string | null;
  EMAIL_PROVIDER_PORT: number | null;
  EMAIL_PROVIDER_USER: string | null;
  EMAIL_PROVIDER_PASSWORD: string | null;
  EMAIL_PROVIDER_FROM: string | null;
  OPENAI_API_KEY: string | null;
  AI_ASSISTANT_ENABLED: boolean;
  CHAT_HISTORY_ENABLED: boolean;
  MCP_SERVER_URL: string | null;
  MCP_SERVER_TOKEN: string | null;
  /** URL da API LowCodeJS enviada ao MCP no header X-Lowcode-Api-Url. */
  MCP_LOWCODE_API_URL: string | null;
  OPENAI_MODEL: string;
  /** Provedor ativo do assistente IA. */
  AI_LLM_PROVIDER: ValueOf<typeof E_AI_LLM_PROVIDER>;
  /** Chave de API do provedor (exceto Ollama). */
  LLM_API_KEY: string | null;
  /** ID do modelo no provedor selecionado. */
  LLM_MODEL: string;
  /** URL base para Ollama ou endpoint customizado. */
  LLM_BASE_URL: string | null;
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
  MIGRATION_ROW_STATUS_TRASHED_AT: Date | null;
};

export const E_LOGGER_ACTION_TYPE = {
  VIEW: 'VIEW',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  AI_CALL: 'AI_CALL',
  AI_RESPONSE: 'AI_RESPONSE',
} as const;

export const E_LOGGER_OBJECT_TYPE = {
  TABLE: 'TABLE',
  FIELD: 'FIELD',
  ROW: 'ROW',
  MENU: 'MENU',
  USER: 'USER',
  EXTENSION: 'EXTENSION',
  GROUP_FIELD: 'GROUP_FIELD',
  GROUP_ROW: 'GROUP_ROW',
  PAGE: 'PAGE',
  PERMISSION: 'PERMISSION',
  PROFILE: 'PROFILE',
  SETTING: 'SETTING',
  SETUP: 'SETUP',
  STORAGE: 'STORAGE',
  USER_GROUP: 'USER_GROUP',
  AI_TOOL: 'AI_TOOL',
} as const;

export type ILogger = Merge<
  Base,
  {
    url: string;
    user: IUser | null;
    action: (typeof E_LOGGER_ACTION_TYPE)[keyof typeof E_LOGGER_ACTION_TYPE];
    object:
      | (typeof E_LOGGER_OBJECT_TYPE)[keyof typeof E_LOGGER_OBJECT_TYPE]
      | null;
    object_id: string | null;
    content: Record<string, unknown> | null;
    // Dados do registro referenciado por object_id (nao do log). Null quando o
    // objeto referenciado nao for uma ROW de tabela dinamica.
    creator: IUser | null;
    updater: IUser | null;
    objectCreatedAt: Date | null;
    objectUpdatedAt: Date | null;
  }
>;

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

export type IExtensionPermissions = {
  /**
   * Roles permitidas a visualizar/usar a extensão. Vazio (`[]`) ou ausente
   * = qualquer usuário autenticado pode ver.
   */
  view: string[];
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
    /** Slots de placement. Apenas para PLUGIN. Plugins podem aparecer em múltiplos slots. */
    slots: string[];
    /** URL default do módulo. Apenas para MODULE. */
    route: string | null;
    /** URL da tela de configuração da extensão. Quando presente, exibe botão "Configurar" em /extensions. */
    configRoute: string | null;
    /** Sub-grupo no menu Ferramentas. Apenas para TOOL. */
    submenu: string | null;
    enabled: boolean;
    /** False se o manifesto não existe mais no disco no boot atual. */
    available: boolean;
    /** Configuração de escopo por tabela (relevante para PLUGIN). */
    tableScope: IExtensionTableScope;
    /** Settings por tabela: mapa tableId -> settings da extensão (campo Mixed). */
    tableSettings: Record<string, Record<string, unknown>>;
    /** Manifesto completo, para auditoria/diagnóstico. */
    manifestSnapshot: Record<string, unknown>;
    requires: IExtensionRequires;
    permissions: IExtensionPermissions;
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

// Capacidades de area do sistema. Antes eram gateadas por role fixo
// (RoleMiddleware); agora viram permissoes atribuiveis a qualquer grupo, como
// pede a especificacao (colunas Usuarios, Menu, Grupos, Configuracoes,
// Ferramentas, Plugins). As acoes de tabela (Ver/Criar/Editar/Remover Tabelas)
// continuam em E_TABLE_PERMISSION. Persistidas como Permission (mesmo slug).
export const E_AREA_CAPABILITY = {
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_MENU: 'MANAGE_MENU',
  MANAGE_USER_GROUPS: 'MANAGE_USER_GROUPS',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_TOOLS: 'MANAGE_TOOLS',
  MANAGE_PLUGINS: 'MANAGE_PLUGINS',
  MANAGE_CHAT: 'MANAGE_CHAT',
} as const;

// Alvo de uma permissao de acao da tabela: um grupo especifico, todos (Public,
// inclui visitante) ou ninguem (Nobody).
export const E_PERMISSION_TARGET = {
  PUBLIC: 'PUBLIC',
  NOBODY: 'NOBODY',
  GROUP: 'GROUP',
} as const;

// Vinculo de uma acao a quem pode realiza-la. `group` so e usado quando
// kind === GROUP (id do grupo).
export type IPermissionBinding = {
  kind: ValueOf<typeof E_PERMISSION_TARGET>;
  group: string | null;
};

// As 10 acoes da tabela vinculaveis por binding (Create/Remove TABLE continuam
// sendo capacidades de grupo, nao por-tabela).
export const TABLE_PERMISSION_ACTIONS = [
  E_TABLE_PERMISSION.VIEW_TABLE,
  E_TABLE_PERMISSION.UPDATE_TABLE,
  E_TABLE_PERMISSION.CREATE_FIELD,
  E_TABLE_PERMISSION.UPDATE_FIELD,
  E_TABLE_PERMISSION.REMOVE_FIELD,
  E_TABLE_PERMISSION.VIEW_FIELD,
  E_TABLE_PERMISSION.CREATE_ROW,
  E_TABLE_PERMISSION.UPDATE_ROW,
  E_TABLE_PERMISSION.REMOVE_ROW,
  E_TABLE_PERMISSION.VIEW_ROW,
] as const;

// Mapa acao -> binding. Parcial: documentos ainda nao backfillados (migration
// 09) podem nao ter o mapa.
export type ITablePermissions = Partial<
  Record<ValueOf<typeof E_TABLE_PERMISSION>, IPermissionBinding>
>;

// Permissoes padrao de uma tabela nova (equivalente ao preset RESTRICTED:
// usuarios logados — grupo Registered — podem ver a tabela e as rows; demais
// acoes ficam restritas ao dono e convidados). Espelha o backfill da migration
// 09 para que nenhuma tabela nasca com `permissions: null`.
export function buildDefaultTablePermissions(
  registeredGroupId: string | null,
): ITablePermissions {
  function nobody(): IPermissionBinding {
    return { kind: E_PERMISSION_TARGET.NOBODY, group: null };
  }

  function loggedView(): IPermissionBinding {
    if (registeredGroupId) {
      return { kind: E_PERMISSION_TARGET.GROUP, group: registeredGroupId };
    }
    return nobody();
  }

  return {
    [E_TABLE_PERMISSION.VIEW_TABLE]: loggedView(),
    [E_TABLE_PERMISSION.UPDATE_TABLE]: nobody(),
    [E_TABLE_PERMISSION.CREATE_FIELD]: nobody(),
    [E_TABLE_PERMISSION.UPDATE_FIELD]: nobody(),
    [E_TABLE_PERMISSION.REMOVE_FIELD]: nobody(),
    [E_TABLE_PERMISSION.VIEW_FIELD]: nobody(),
    [E_TABLE_PERMISSION.CREATE_ROW]: nobody(),
    [E_TABLE_PERMISSION.UPDATE_ROW]: nobody(),
    [E_TABLE_PERMISSION.REMOVE_ROW]: nobody(),
    [E_TABLE_PERMISSION.VIEW_ROW]: loggedView(),
  };
}

// Perfis fixos de convidados da tabela (colaboracao).
export const E_TABLE_PROFILE = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  CONTRIBUTOR: 'CONTRIBUTOR',
  VIEWER: 'VIEWER',
} as const;

export type ITableMember = {
  user: string;
  profile: ValueOf<typeof E_TABLE_PROFILE>;
};

// Nivel de acesso de um perfil a uma acao: libera, nega ou libera apenas para os
// proprios registros (apenas a sua).
export const E_PROFILE_ACCESS = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  OWN: 'OWN',
} as const;

// Matriz fixa de perfis x acoes, conforme a especificacao (aba 060226-Oficial).
// Observacao: View field aparece como "nao" para editor/contributor/viewer —
// mantido fiel ao documento (controla a tela de gestao de campos, nao o valor da
// row). VIEWER segue a planilha literal: cria/edita/remove rows
// (CREATE/UPDATE/REMOVE_ROW = ALLOW), ficando funcionalmente igual ao EDITOR.
export const TABLE_PROFILE_MATRIX: Record<
  ValueOf<typeof E_TABLE_PROFILE>,
  Record<ValueOf<typeof E_TABLE_PERMISSION>, ValueOf<typeof E_PROFILE_ACCESS>>
> = {
  [E_TABLE_PROFILE.OWNER]: {
    [E_TABLE_PERMISSION.CREATE_TABLE]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.REMOVE_TABLE]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.VIEW_TABLE]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_TABLE]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.CREATE_FIELD]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_FIELD]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.REMOVE_FIELD]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.VIEW_FIELD]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.CREATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.REMOVE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.VIEW_ROW]: E_PROFILE_ACCESS.ALLOW,
  },
  [E_TABLE_PROFILE.ADMIN]: {
    [E_TABLE_PERMISSION.CREATE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.REMOVE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.VIEW_TABLE]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.CREATE_FIELD]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_FIELD]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.REMOVE_FIELD]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.VIEW_FIELD]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.CREATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.REMOVE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.VIEW_ROW]: E_PROFILE_ACCESS.ALLOW,
  },
  [E_TABLE_PROFILE.EDITOR]: {
    [E_TABLE_PERMISSION.CREATE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.REMOVE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.VIEW_TABLE]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.CREATE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.UPDATE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.REMOVE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.VIEW_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.CREATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.REMOVE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.VIEW_ROW]: E_PROFILE_ACCESS.ALLOW,
  },
  [E_TABLE_PROFILE.CONTRIBUTOR]: {
    [E_TABLE_PERMISSION.CREATE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.REMOVE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.VIEW_TABLE]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.CREATE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.UPDATE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.REMOVE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.VIEW_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.CREATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_ROW]: E_PROFILE_ACCESS.OWN,
    [E_TABLE_PERMISSION.REMOVE_ROW]: E_PROFILE_ACCESS.OWN,
    [E_TABLE_PERMISSION.VIEW_ROW]: E_PROFILE_ACCESS.ALLOW,
  },
  [E_TABLE_PROFILE.VIEWER]: {
    [E_TABLE_PERMISSION.CREATE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.REMOVE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.VIEW_TABLE]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_TABLE]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.CREATE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.UPDATE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.REMOVE_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.VIEW_FIELD]: E_PROFILE_ACCESS.DENY,
    [E_TABLE_PERMISSION.CREATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.UPDATE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.REMOVE_ROW]: E_PROFILE_ACCESS.ALLOW,
    [E_TABLE_PERMISSION.VIEW_ROW]: E_PROFILE_ACCESS.ALLOW,
  },
};

// Binding de visibilidade de um campo: visivel = PUBLIC, oculto = NOBODY.
function fieldVisibilityBinding(visible: boolean): IPermissionBinding {
  if (visible) return { kind: E_PERMISSION_TARGET.PUBLIC, group: null };
  return { kind: E_PERMISSION_TARGET.NOBODY, group: null };
}

// Monta o mapa de permissoes de campo por contexto a partir de flags booleanas
// (compat com a configuracao antiga list/form/detail = visivel/oculto).
export function buildFieldPermissions(
  list: boolean,
  form: boolean,
  detail: boolean,
): IFieldPermissions {
  return {
    list: fieldVisibilityBinding(list),
    form: fieldVisibilityBinding(form),
    detail: fieldVisibilityBinding(detail),
  };
}

// Rotulos default dos campos nativos (fonte unica). Os `name` das listas nativas
// referenciam este mapa; o frontend tambem o espelha para o placeholder do editor.
export const NATIVE_FIELD_LABEL_DEFAULTS: Record<string, string> = {
  _id: 'ID',
  creator: 'Criador',
  createdAt: 'Criado em',
  updatedAt: 'Modificado em',
  updater: 'Modificado por',
  status: 'Status',
  trashedAt: 'Enviado para lixeira em',
};

export const FIELD_NATIVE_LIST: FieldCreatePayload[] = [
  {
    name: NATIVE_FIELD_LABEL_DEFAULTS._id,
    slug: '_id',
    type: E_FIELD_TYPE.IDENTIFIER,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(false, false, false),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.creator,
    slug: 'creator',
    type: E_FIELD_TYPE.CREATOR,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: true,
    permissions: buildFieldPermissions(true, false, true),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.createdAt,
    slug: 'createdAt',
    type: E_FIELD_TYPE.CREATED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
    showInFilter: true,
    permissions: buildFieldPermissions(true, false, true),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.updatedAt,
    slug: 'updatedAt',
    type: E_FIELD_TYPE.UPDATED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
    showInFilter: true,
    permissions: buildFieldPermissions(true, false, true),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.updater,
    slug: 'updater',
    type: E_FIELD_TYPE.UPDATER,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: true,
    permissions: buildFieldPermissions(true, false, true),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.status,
    slug: 'status',
    type: E_FIELD_TYPE.STATUS,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(false, false, false),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.trashedAt,
    slug: 'trashedAt',
    type: E_FIELD_TYPE.TRASHED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(false, false, false),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS._id,
    slug: '_id',
    type: E_FIELD_TYPE.IDENTIFIER,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(false, false, false),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.creator,
    slug: 'creator',
    type: E_FIELD_TYPE.CREATOR,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: true,
    permissions: buildFieldPermissions(true, false, true),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.createdAt,
    slug: 'createdAt',
    type: E_FIELD_TYPE.CREATED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
    showInFilter: true,
    permissions: buildFieldPermissions(true, false, true),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.updatedAt,
    slug: 'updatedAt',
    type: E_FIELD_TYPE.UPDATED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS,
    showInFilter: true,
    permissions: buildFieldPermissions(true, false, true),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.updater,
    slug: 'updater',
    type: E_FIELD_TYPE.UPDATER,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: true,
    permissions: buildFieldPermissions(true, false, true),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.status,
    slug: 'status',
    type: E_FIELD_TYPE.STATUS,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(false, false, false),
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
    name: NATIVE_FIELD_LABEL_DEFAULTS.trashedAt,
    slug: 'trashedAt',
    type: E_FIELD_TYPE.TRASHED_AT,
    native: true,
    locked: true,
    required: false,
    multiple: false,
    format: null,
    showInFilter: false,
    permissions: buildFieldPermissions(false, false, false),
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
