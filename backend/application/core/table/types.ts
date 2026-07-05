/* eslint-disable no-unused-vars */
/**
 * Types for the JavaScript code executor
 */

export type ExecutionErrorType = 'syntax' | 'runtime' | 'timeout' | 'unknown';

export type ExecutionError = {
  type: ExecutionErrorType;
  message: string;
  line?: number;
  column?: number;
}

export type ExecutionResult = {
  success: boolean;
  error?: ExecutionError;
  logs: string[];
}

export type UserAction =
  | 'novo_registro'
  | 'editar_registro'
  | 'excluir_registro'
  | 'carregamento_formulario';

export type ExecutionMoment =
  | 'carregamento_formulario'
  | 'antes_salvar'
  | 'depois_salvar';

export type TableInfo = {
  readonly _id: string;
  readonly name: string;
  readonly slug: string;
}

export type ExecutionContext = {
  userAction: UserAction;
  executionMoment: ExecutionMoment;
  userId?: string;
  isNew?: boolean;
  tableInfo?: TableInfo;
  /**
   * True quando o script é disparado pelo hook `pre('save')`/`post('save')` do
   * Mongoose (model-builder), e não pelo use-case do controller. Como `create`
   * roda o beforeSave nas DUAS camadas (use-case + hook), scripts com efeitos
   * colaterais (email/notificação) devem usar este flag para não duplicar.
   */
  viaSaveHook?: boolean;
  /**
   * Estado do registro ANTES do save (apenas em update via use-case). `null` em
   * create. Permite ao script comparar valor anterior × novo (ex.: detectar
   * novas mensagens adicionadas a um grupo).
   */
  previous?: Record<string, unknown> | null;
}

export type FieldDefinition = {
  slug: string;
  type: string;
  name: string;
  multiple?: boolean;
  // Para RELATIONSHIP
  relationship?: {
    table: { _id: string; slug: string };
    field: { _id: string; slug: string };
  };
  // Para FIELD_GROUP
  group?: {
    _id?: string;
    slug: string;
  };
  // Para DROPDOWN
  dropdown?: Array<{ id: string; label: string; color?: string | null }>;
  // Para CATEGORY
  category?: Array<{ id: string; label: string; children: unknown[] }>;
}

export type EmailResult = {
  success: boolean;
  message: string;
  recipients?: number;
}

export type FieldApi = {
  get(slug: string): unknown;
  set(slug: string, value: unknown): void;
  getAll(): Record<string, unknown>;
  getLabel(slug: string, value?: string): string;
}

export type ContextApi = {
  readonly action: UserAction;
  readonly moment: ExecutionMoment;
  readonly userId: string;
  readonly isNew: boolean;
  readonly appUrl: string;
  readonly table: TableInfo;
  /** True quando disparado pelo hook de save do Mongoose (ver ExecutionContext). */
  readonly reentrant: boolean;
  /** Registro antes do save (update) ou null (create). */
  readonly previous: Record<string, unknown> | null;
}

export type SandboxUser = {
  _id: string;
  name: string;
  email: string;
}

export type UsersApi = {
  /** Resolve ids (string | objeto populado | ObjectId | array deles) em usuários. */
  resolve(ids: unknown): Promise<SandboxUser[]>;
  /** Atalho que retorna apenas os emails válidos e únicos dos ids informados. */
  emails(ids: unknown): Promise<string[]>;
}

export type NotifyInput = {
  userIds: unknown;
  title: string;
  body?: string | null;
  action?: {
    type: 'route' | 'url';
    href: string;
    label?: string | null;
  } | null;
  source?: {
    pkg?: string | null;
    tableSlug?: string | null;
    rowId?: string | null;
    anchorId?: string | null;
  } | null;
  /** Tipo da notificação (E_NOTIFICATION_TYPE). Default: GENERIC. */
  type?: string;
  /** Ator excluído dos destinatários. Default: context.userId. */
  actorUserId?: string | null;
}

export type NotifyApi = {
  /** Cria notificações in-app (uma por usuário) e emite via socket. */
  send(input: NotifyInput): Promise<{ success: boolean; recipients: number }>;
}

export type EmailApi = {
  send(to: string[], subject: string, body: string): Promise<EmailResult>;
  sendTemplate(
    to: string[],
    subject: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<EmailResult>;
}

export type UtilsApi = {
  today(): Date;
  now(): Date;
  formatDate(date: Date, format?: string): string;
  sha256(text: string): string;
  uuid(): string;
}

export type SandboxGlobals = {
  field: FieldApi;
  context: ContextApi;
  email: EmailApi;
  users: UsersApi;
  notify: NotifyApi;
  utils: UtilsApi;
  console: {
    log: (...args: unknown[]) => void;

    warn: (...args: unknown[]) => void;

    error: (...args: unknown[]) => void;
  };
  // Builtins will be added dynamically
  [key: string]: unknown;
}
