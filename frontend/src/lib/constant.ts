import type { Meta, ValueOf } from './interfaces';

export const TABLE_NAME_REGEX =
  /^[a-zA-ZáàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ0-9\s\-_]+$/;

export const MetaDefault: Meta = {
  total: 1,
  perPage: 50,
  page: 1,
  lastPage: 1,
  firstPage: 1,
};

export const E_MENU_ITEM_TYPE = {
  TABLE: 'TABLE',
  PAGE: 'PAGE',
  FORM: 'FORM',
  EXTERNAL: 'EXTERNAL',
  SEPARATOR: 'SEPARATOR',
  EXTENSION_MODULE: 'EXTENSION_MODULE',
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

// Tipos que renderizam os selecionados como chips quando `multiple` — os unicos
// em que `field.visibleChipsLimit` (resumo "+N") tem efeito. `ReadonlyArray<
// string>` porque o tipo chega dos forms como string solta; o `satisfies`
// mantem os elementos presos ao enum.
export const CHIPS_LIMIT_FIELD_TYPES: ReadonlyArray<string> = [
  E_FIELD_TYPE.DROPDOWN,
  E_FIELD_TYPE.RELATIONSHIP,
  E_FIELD_TYPE.USER,
] satisfies ReadonlyArray<ValueOf<typeof E_FIELD_TYPE>>;

// Rotulos default dos campos nativos (espelha o backend). Usado como placeholder
// no editor de rotulo de campo nativo. Chave = slug do campo nativo.
export const NATIVE_FIELD_LABEL_DEFAULTS: Record<string, string> = {
  _id: 'ID',
  creator: 'Criador',
  createdAt: 'Criado em',
  updatedAt: 'Modificado em',
  updater: 'Modificado por',
  status: 'Status',
  trashedAt: 'Enviado para lixeira em',
};

export const E_RELATIONSHIP_ON_DELETE = {
  CASCADE: 'CASCADE',
  SET_NULL: 'SET_NULL',
  RESTRICT: 'RESTRICT',
} as const;

export const E_ROW_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

export const E_ROLE = {
  MASTER: 'MASTER',
  ADMINISTRATOR: 'ADMINISTRATOR',
  MANAGER: 'MANAGER',
  REGISTERED: 'REGISTERED',
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

// Regras de validacao de valor de campo (espelha o backend E_FIELD_VALIDATION).
// Cada regra vive numa subpasta em backend/application/core/validations.
export const E_FIELD_VALIDATION = {
  NOT_EMPTY: 'NOT_EMPTY',
  IS_EMAIL: 'IS_EMAIL',
  IS_NUMERIC: 'IS_NUMERIC',
  IS_ALPHA_NUMERIC: 'IS_ALPHA_NUMERIC',
  IS_IN_RANGE: 'IS_IN_RANGE',
  IS_IBAN: 'IS_IBAN',
  IS_NOT: 'IS_NOT',
  IS_URL: 'IS_URL',
  IS_PHONE: 'IS_PHONE',
  IS_CPF: 'IS_CPF',
  IS_CNPJ: 'IS_CNPJ',
  IS_UNIQUE: 'IS_UNIQUE',
  ARE_UNIQUE_VALUES: 'ARE_UNIQUE_VALUES',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  USER_EXISTS: 'USER_EXISTS',
} as const;

// Opcoes para o dropdown de validacoes no editor de campo. `types` lista os
// tipos elegiveis ([] = qualquer tipo); `multipleOnly` exige field.multiple;
// `requiresConfig` indica regras com parametros (range/is-not). `async` marca
// regras que so validam no backend (banco) — front nao roda no submit.
export const FIELD_VALIDATION_OPTIONS = [
  {
    label: 'Não vazio',
    value: E_FIELD_VALIDATION.NOT_EMPTY,
    types: [E_FIELD_TYPE.TEXT_SHORT, E_FIELD_TYPE.TEXT_LONG],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'É e-mail',
    value: E_FIELD_VALIDATION.IS_EMAIL,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'É numérico',
    value: E_FIELD_VALIDATION.IS_NUMERIC,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'É alfanumérico',
    value: E_FIELD_VALIDATION.IS_ALPHA_NUMERIC,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'Maior ou menor que',
    value: E_FIELD_VALIDATION.IS_IN_RANGE,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: true,
    async: false,
  },
  {
    label: 'É IBAN',
    value: E_FIELD_VALIDATION.IS_IBAN,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'Diferente de',
    value: E_FIELD_VALIDATION.IS_NOT,
    types: [E_FIELD_TYPE.TEXT_SHORT, E_FIELD_TYPE.TEXT_LONG],
    requiresConfig: true,
    async: false,
  },
  {
    label: 'É URL',
    value: E_FIELD_VALIDATION.IS_URL,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'É telefone',
    value: E_FIELD_VALIDATION.IS_PHONE,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'É CPF',
    value: E_FIELD_VALIDATION.IS_CPF,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'É CNPJ',
    value: E_FIELD_VALIDATION.IS_CNPJ,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: false,
  },
  {
    label: 'Valor único',
    value: E_FIELD_VALIDATION.IS_UNIQUE,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: true,
  },
  {
    label: 'Valores únicos',
    value: E_FIELD_VALIDATION.ARE_UNIQUE_VALUES,
    types: [],
    multipleOnly: true,
    requiresConfig: false,
    async: true,
  },
  {
    label: 'E-mail existe',
    value: E_FIELD_VALIDATION.EMAIL_EXISTS,
    types: [E_FIELD_TYPE.TEXT_SHORT],
    requiresConfig: false,
    async: true,
  },
  {
    label: 'Usuário existe',
    value: E_FIELD_VALIDATION.USER_EXISTS,
    types: [E_FIELD_TYPE.TEXT_SHORT, E_FIELD_TYPE.USER],
    requiresConfig: false,
    async: true,
  },
] as const;

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

export const E_EXTENSION_TYPE = {
  PLUGIN: 'PLUGIN',
  MODULE: 'MODULE',
  TOOL: 'TOOL',
} as const;

export const EXTENSION_TYPE_LABEL: Record<
  (typeof E_EXTENSION_TYPE)[keyof typeof E_EXTENSION_TYPE],
  string
> = {
  PLUGIN: 'Plugin',
  MODULE: 'Módulo',
  TOOL: 'Ferramenta',
};

export const E_TOKEN_STATUS = {
  REQUESTED: 'REQUESTED',
  EXPIRED: 'EXPIRED',
  VALIDATED: 'VALIDATED',
} as const;

export const E_JWT_TYPE = {
  ACCESS: 'ACCESS',
  REFRESH: 'REFRESH',
} as const;

export const E_USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

// MANTER SEM PADRÃO UPPERCASE POIS MAPEIA AS CHAVE <- VALOR PARA MONGOOSE
export const E_SCHEMA_TYPE = {
  NUMBER: 'Number',
  STRING: 'String',
  DATE: 'Date',
  BOOLEAN: 'Boolean',
  OBJECT_ID: 'ObjectId',
} as const;

export const E_REACTION_TYPE = {
  LIKE: 'LIKE',
  UNLIKE: 'UNLIKE',
} as const;

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

// Capacidades de area do sistema (gerenciamento por area, atribuiveis a grupos).
export const E_AREA_CAPABILITY = {
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_MENU: 'MANAGE_MENU',
  MANAGE_USER_GROUPS: 'MANAGE_USER_GROUPS',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_TOOLS: 'MANAGE_TOOLS',
  MANAGE_PLUGINS: 'MANAGE_PLUGINS',
  MANAGE_CHAT: 'MANAGE_CHAT',
} as const;

// Alvo de uma permissao de acao da tabela.
export const E_PERMISSION_TARGET = {
  PUBLIC: 'PUBLIC',
  NOBODY: 'NOBODY',
  GROUP: 'GROUP',
} as const;

// Perfis fixos de convidados da tabela.
export const E_TABLE_PROFILE = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  CONTRIBUTOR: 'CONTRIBUTOR',
  VIEWER: 'VIEWER',
} as const;

export const TABLE_PROFILE_MAPPER: Record<string, string> = {
  [E_TABLE_PROFILE.OWNER]: 'Dono',
  [E_TABLE_PROFILE.ADMIN]: 'Administrador',
  [E_TABLE_PROFILE.EDITOR]: 'Editor',
  [E_TABLE_PROFILE.CONTRIBUTOR]: 'Colaborador',
  [E_TABLE_PROFILE.VIEWER]: 'Visualizador',
};

// As 10 acoes da tabela vinculaveis por binding, na ordem de exibicao.
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

export const PERMISSION_LABEL_MAPPER: Record<string, string> = {
  [E_TABLE_PERMISSION.CREATE_TABLE]: 'Criar tabela',
  [E_TABLE_PERMISSION.UPDATE_TABLE]: 'Editar tabela',
  [E_TABLE_PERMISSION.REMOVE_TABLE]: 'Remover tabela',
  [E_TABLE_PERMISSION.VIEW_TABLE]: 'Visualizar tabela',
  [E_TABLE_PERMISSION.CREATE_FIELD]: 'Criar campo',
  [E_TABLE_PERMISSION.UPDATE_FIELD]: 'Editar campo',
  [E_TABLE_PERMISSION.REMOVE_FIELD]: 'Remover campo',
  [E_TABLE_PERMISSION.VIEW_FIELD]: 'Visualizar campo',
  [E_TABLE_PERMISSION.CREATE_ROW]: 'Criar registro',
  [E_TABLE_PERMISSION.UPDATE_ROW]: 'Editar registro',
  [E_TABLE_PERMISSION.REMOVE_ROW]: 'Remover registro',
  [E_TABLE_PERMISSION.VIEW_ROW]: 'Visualizar registro',
  [E_AREA_CAPABILITY.MANAGE_USERS]: 'Gerenciar usuários',
  [E_AREA_CAPABILITY.MANAGE_MENU]: 'Gerenciar menu',
  [E_AREA_CAPABILITY.MANAGE_USER_GROUPS]: 'Gerenciar grupos de usuários',
  [E_AREA_CAPABILITY.MANAGE_SETTINGS]: 'Gerenciar configurações',
  [E_AREA_CAPABILITY.MANAGE_TOOLS]: 'Gerenciar ferramentas',
  [E_AREA_CAPABILITY.MANAGE_PLUGINS]: 'Gerenciar plugins',
  [E_AREA_CAPABILITY.MANAGE_CHAT]: 'Usar o assistente de IA',
};

// Descrições de cada permissão/capacidade (pedido do QA: "explicar o que cada
// opção faz"). Espelham as descrições do seed do backend.
export const PERMISSION_DESCRIPTION_MAPPER: Record<string, string> = {
  [E_TABLE_PERMISSION.CREATE_TABLE]: 'Permite criar uma nova tabela.',
  [E_TABLE_PERMISSION.UPDATE_TABLE]:
    'Permite editar os dados/configuração de uma tabela existente.',
  [E_TABLE_PERMISSION.REMOVE_TABLE]: 'Permite remover ou excluir tabelas.',
  [E_TABLE_PERMISSION.VIEW_TABLE]: 'Permite visualizar uma tabela existente.',
  [E_TABLE_PERMISSION.CREATE_FIELD]:
    'Permite criar campos em uma tabela existente.',
  [E_TABLE_PERMISSION.UPDATE_FIELD]:
    'Permite editar campos de uma tabela existente.',
  [E_TABLE_PERMISSION.REMOVE_FIELD]:
    'Permite remover ou excluir campos de uma tabela existente.',
  [E_TABLE_PERMISSION.VIEW_FIELD]:
    'Permite visualizar os campos de uma tabela existente.',
  [E_TABLE_PERMISSION.CREATE_ROW]:
    'Permite criar novos registros em uma tabela existente.',
  [E_TABLE_PERMISSION.UPDATE_ROW]:
    'Permite editar registros de uma tabela existente.',
  [E_TABLE_PERMISSION.REMOVE_ROW]:
    'Permite remover registros de uma tabela existente.',
  [E_TABLE_PERMISSION.VIEW_ROW]:
    'Permite visualizar registros de uma tabela existente.',
  [E_AREA_CAPABILITY.MANAGE_USERS]: 'Permite gerenciar os usuários do sistema.',
  [E_AREA_CAPABILITY.MANAGE_MENU]: 'Permite gerenciar as opções de menu.',
  [E_AREA_CAPABILITY.MANAGE_USER_GROUPS]:
    'Permite gerenciar os grupos de usuários e suas permissões.',
  [E_AREA_CAPABILITY.MANAGE_SETTINGS]:
    'Permite gerenciar as configurações do sistema.',
  [E_AREA_CAPABILITY.MANAGE_TOOLS]:
    'Permite gerenciar as ferramentas (extensões do tipo tool).',
  [E_AREA_CAPABILITY.MANAGE_PLUGINS]: 'Permite gerenciar os plugins.',
  [E_AREA_CAPABILITY.MANAGE_CHAT]: 'Permite usar o chat do assistente de IA.',
};

// ============== OPTIONS PARA SELECTS ==============
export const FIELD_TYPE_OPTIONS = [
  { label: 'Texto curto', value: E_FIELD_TYPE.TEXT_SHORT },
  { label: 'Texto longo', value: E_FIELD_TYPE.TEXT_LONG },
  { label: 'Dropdown', value: E_FIELD_TYPE.DROPDOWN },
  { label: 'Arquivo', value: E_FIELD_TYPE.FILE },
  { label: 'Data', value: E_FIELD_TYPE.DATE },
  { label: 'Relacionamento', value: E_FIELD_TYPE.RELATIONSHIP },
  { label: 'Grupo de campos', value: E_FIELD_TYPE.FIELD_GROUP },
  { label: 'Categoria', value: E_FIELD_TYPE.CATEGORY },
  { label: 'Reação', value: E_FIELD_TYPE.REACTION },
  { label: 'Avaliação', value: E_FIELD_TYPE.EVALUATION },
  { label: 'Usuário', value: E_FIELD_TYPE.USER },
  { label: 'Grupos de usuários', value: E_FIELD_TYPE.USER_GROUP },
  { label: 'Conteúdo HTML', value: E_FIELD_TYPE.HTML_CONTENT },
] as const;

export const TEXT_FORMAT_OPTIONS = [
  { label: 'Alfanumérico', value: E_FIELD_FORMAT.ALPHA_NUMERIC },
  { label: 'Inteiro', value: E_FIELD_FORMAT.INTEGER },
  { label: 'Decimal', value: E_FIELD_FORMAT.DECIMAL },
  { label: 'URL', value: E_FIELD_FORMAT.URL },
  { label: 'E-mail', value: E_FIELD_FORMAT.EMAIL },
  { label: 'Senha', value: E_FIELD_FORMAT.PASSWORD },
  { label: 'Telefone', value: E_FIELD_FORMAT.PHONE },
  { label: 'CNPJ', value: E_FIELD_FORMAT.CNPJ },
  { label: 'CPF', value: E_FIELD_FORMAT.CPF },
] as const;

export const TEXT_LONG_FORMAT_OPTIONS = [
  { label: 'Área de texto', value: E_FIELD_FORMAT.PLAIN_TEXT },
  { label: 'Editor rico', value: E_FIELD_FORMAT.RICH_TEXT },
] as const;

export const DATE_FORMAT_OPTIONS = [
  { label: 'DD/MM/AAAA', value: E_FIELD_FORMAT.DD_MM_YYYY },
  { label: 'MM/DD/AAAA', value: E_FIELD_FORMAT.MM_DD_YYYY },
  { label: 'AAAA/MM/DD', value: E_FIELD_FORMAT.YYYY_MM_DD },
  { label: 'DD/MM/AAAA hh:mm:ss', value: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS },
  { label: 'MM/DD/AAAA hh:mm:ss', value: E_FIELD_FORMAT.MM_DD_YYYY_HH_MM_SS },
  { label: 'AAAA/MM/DD hh:mm:ss', value: E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS },
  { label: 'DD-MM-AAAA', value: E_FIELD_FORMAT.DD_MM_YYYY_DASH },
  { label: 'MM-DD-AAAA', value: E_FIELD_FORMAT.MM_DD_YYYY_DASH },
  { label: 'AAAA-MM-DD', value: E_FIELD_FORMAT.YYYY_MM_DD_DASH },
  {
    label: 'DD-MM-AAAA hh:mm:ss',
    value: E_FIELD_FORMAT.DD_MM_YYYY_HH_MM_SS_DASH,
  },
  {
    label: 'MM-DD-AAAA hh:mm:ss',
    value: E_FIELD_FORMAT.MM_DD_YYYY_HH_MM_SS_DASH,
  },
  {
    label: 'AAAA-MM-DD hh:mm:ss',
    value: E_FIELD_FORMAT.YYYY_MM_DD_HH_MM_SS_DASH,
  },
] as const;

export const MENU_ITEM_TYPE_OPTIONS = [
  { label: 'Tabela', value: E_MENU_ITEM_TYPE.TABLE },
  { label: 'Página', value: E_MENU_ITEM_TYPE.PAGE },
  { label: 'Formulário', value: E_MENU_ITEM_TYPE.FORM },
  { label: 'Link Externo', value: E_MENU_ITEM_TYPE.EXTERNAL },
  { label: 'Separador', value: E_MENU_ITEM_TYPE.SEPARATOR },
  { label: 'Módulo de Extensão', value: E_MENU_ITEM_TYPE.EXTENSION_MODULE },
] as const;

export const TABLE_STYLE_OPTIONS = [
  { label: 'Lista', value: E_TABLE_STYLE.LIST },
  { label: 'Galeria', value: E_TABLE_STYLE.GALLERY },
  { label: 'Documento', value: E_TABLE_STYLE.DOCUMENT },
  { label: 'Card', value: E_TABLE_STYLE.CARD },
  { label: 'Mosaico', value: E_TABLE_STYLE.MOSAIC },
  { label: 'Kanban', value: E_TABLE_STYLE.KANBAN },
  { label: 'Forum', value: E_TABLE_STYLE.FORUM },
  { label: 'Calendario', value: E_TABLE_STYLE.CALENDAR },
  { label: 'Gantt', value: E_TABLE_STYLE.GANTT },
] as const;

export const USER_GROUP_MAPPER = {
  [E_ROLE.ADMINISTRATOR]: 'Administrador',
  [E_ROLE.REGISTERED]: 'Registrado',
  [E_ROLE.MANAGER]: 'Gerente',
  [E_ROLE.MASTER]: 'Master (Super Administrador)',
} as const;

export const USER_STATUS_MAPPER = {
  [E_USER_STATUS.ACTIVE]: 'Ativo',
  [E_USER_STATUS.INACTIVE]: 'Inativo',
} as const;

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/;

// Socket.IO Chat Events
export const E_CHAT_EVENT = {
  // Server -> Client
  STATUS: 'status',
  READY: 'ready',
  THINKING: 'thinking',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  TOOL_ERROR: 'tool_error',
  MESSAGE: 'message',
  ERROR: 'error',
  LLM_INFO: 'llm_info',
  // Client -> Server
  HISTORY: 'history',
} as const;

export const E_AI_LLM_PROVIDER = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  CLAUDE: 'claude',
  OPENROUTER: 'openrouter',
  OLLAMA: 'ollama',
} as const;

// Socket.IO Notification Events
export const E_NOTIFICATION_EVENT = {
  CREATED: 'notification:created',
  READ: 'notification:read',
  READ_ALL: 'notification:read_all',
} as const;

export const E_NOTIFICATION_TYPE = {
  FORUM_MENTION: 'FORUM_MENTION',
  KANBAN_COMMENT_MENTION: 'KANBAN_COMMENT_MENTION',
  ROW_MEMBER_ASSIGNED: 'ROW_MEMBER_ASSIGNED',
  GENERIC: 'GENERIC',
} as const;

// Tool name prefixes for query invalidation mapping
export const E_CHAT_TOOL_PREFIX = {
  TABLES: 'tables_',
  FIELDS: 'fields_',
  ROWS: 'rows_',
  FILES: 'files_',
  PROFILE: 'profile_',
} as const;

// ============== LOGS / HISTORICO ==============
export const E_LOGGER_ACTION_TYPE = {
  VIEW: 'VIEW',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
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
} as const;

export const LOGGER_ACTION_LABEL: Record<
  (typeof E_LOGGER_ACTION_TYPE)[keyof typeof E_LOGGER_ACTION_TYPE],
  string
> = {
  VIEW: 'Visualização',
  CREATE: 'Criação',
  UPDATE: 'Edição',
  DELETE: 'Exclusão',
};

export const LOGGER_OBJECT_LABEL: Record<
  (typeof E_LOGGER_OBJECT_TYPE)[keyof typeof E_LOGGER_OBJECT_TYPE],
  string
> = {
  TABLE: 'Tabela',
  FIELD: 'Campo',
  ROW: 'Registro',
  MENU: 'Menu',
  USER: 'Usuário',
  EXTENSION: 'Extensão',
  GROUP_FIELD: 'Grupo de campos',
  GROUP_ROW: 'Grupo de registros',
  PAGE: 'Página',
  PERMISSION: 'Permissão',
  PROFILE: 'Perfil',
  SETTING: 'Configuração',
  SETUP: 'Setup',
  STORAGE: 'Arquivo',
  USER_GROUP: 'Grupo de usuário',
};

// ============== SETUP WIZARD ==============
export const SETUP_STEPS = [
  'admin',
  'name',
  'storage',
  'logos',
  'upload',
  'paging',
  'email',
] as const;

export const SETUP_STEP_LABELS = {
  admin: 'Administrador',
  name: 'Identidade',
  storage: 'Armazenamento',
  logos: 'Logos',
  upload: 'Uploads',
  paging: 'Paginação',
  email: 'Email',
} as const;

export const SETUP_NEXT_STEP = {
  admin: 'name',
  name: 'storage',
  storage: 'logos',
  logos: 'upload',
  upload: 'paging',
  paging: 'email',
  email: null,
} as const;
