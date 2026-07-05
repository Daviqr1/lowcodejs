/**
 * Static TypeScript type declarations for the sandbox API
 * These provide IntelliSense support in the Monaco editor
 */
export const STATIC_SANDBOX_TYPES = `
// ====== FIELD API ======
type FieldApi = {
  /**
   * Gets the value of a field by its slug
   * @param slug - The field slug (e.g., 'titulo', 'data-nascimento')
   * @returns The field value
   */
  get(slug: string): any;

  /**
   * Sets the value of a field
   * @param slug - The field slug
   * @param value - The new value (will be auto-converted)
   */
  set(slug: string, value: any): void;

  /**
   * Gets all fields as an object
   * @returns Object with all field slugs and values
   */
  getAll(): Record<string, any>;

  /**
   * Gets the display label of a dropdown field value.
   * For dropdown fields, resolves the option label by value.
   * For non-dropdown fields (or unknown values), returns the raw value as string.
   * @param slug - The field slug
   * @param value - Optional value to resolve; when omitted, resolves the current value of the field
   * @returns The resolved label, or the raw value as string
   */
  getLabel(slug: string, value?: string): string;
}

// ====== CONTEXT API ======
type UserAction = 'novo_registro' | 'editar_registro' | 'excluir_registro' | 'carregamento_formulario';
type ExecutionMoment = 'carregamento_formulario' | 'antes_salvar' | 'depois_salvar';

// ====== TABLE INFO ======
type TableInfo = {
  /** ID da tabela */
  readonly _id: string;
  /** Nome da tabela */
  readonly name: string;
  /** Slug da tabela */
  readonly slug: string;
}

type ContextApi = {
  /** The current user action */
  readonly action: UserAction;
  /** The execution moment (hook type) */
  readonly moment: ExecutionMoment;
  /** The current user ID */
  readonly userId: string;
  /** Whether this is a new record */
  readonly isNew: boolean;
  /** Public URL of the frontend application (APP_CLIENT_URL) */
  readonly appUrl: string;
  /** Information about the current table */
  readonly table: TableInfo;
}

// ====== EMAIL API ======
type EmailResult = {
  success: boolean;
  message: string;
  recipients?: number;
}

type EmailApi = {
  /**
   * Sends a plain email
   * @param to - Array of recipient email addresses
   * @param subject - Email subject
   * @param body - Email body (plain text or HTML)
   * @returns Promise with the result
   */
  send(to: string[], subject: string, body: string): Promise<EmailResult>;

  /**
   * Sends an email using a template
   * @param to - Array of recipient email addresses
   * @param subject - Email subject
   * @param message - Template message
   * @param data - Optional data to inject into template
   * @returns Promise with the result
   */
  sendTemplate(to: string[], subject: string, message: string, data?: Record<string, any>): Promise<EmailResult>;
}

// ====== UTILS API ======
type UtilsApi = {
  /**
   * Returns today's date at midnight
   * @returns Date object for today at 00:00:00
   */
  today(): Date;

  /**
   * Returns the current date and time
   * @returns Current Date object
   */
  now(): Date;

  /**
   * Formats a date according to the specified format
   * @param date - The date to format
   * @param format - Format string (default: 'dd/MM/yyyy')
   * @returns Formatted date string
   */
  formatDate(date: Date, format?: string): string;

  /**
   * Generates SHA256 hash of a string
   * @param text - The text to hash
   * @returns Hexadecimal hash string
   */
  sha256(text: string): string;

  /**
   * Generates a random UUID
   * @returns UUID string
   */
  uuid(): string;
}

// ====== GLOBAL DECLARATIONS ======
declare const field: FieldApi;
declare const context: ContextApi;
declare const email: EmailApi;
declare const utils: UtilsApi;

// ====== BUILTINS ======
// These are available in the sandbox
declare const console: Console;
declare const JSON: JSON;
declare const Date: DateConstructor;
declare const Math: Math;
declare const parseInt: typeof globalThis.parseInt;
declare const parseFloat: typeof globalThis.parseFloat;
declare const isNaN: typeof globalThis.isNaN;
declare const isFinite: typeof globalThis.isFinite;
declare const Number: NumberConstructor;
declare const String: StringConstructor;
declare const Boolean: BooleanConstructor;
declare const Array: ArrayConstructor;
declare const Object: ObjectConstructor;
declare const RegExp: RegExpConstructor;
declare const Map: MapConstructor;
declare const Set: SetConstructor;
declare const Promise: PromiseConstructor;
declare const Error: ErrorConstructor;
declare const TypeError: TypeErrorConstructor;
declare const RangeError: RangeErrorConstructor;
declare const SyntaxError: SyntaxErrorConstructor;
declare const encodeURIComponent: typeof globalThis.encodeURIComponent;
declare const decodeURIComponent: typeof globalThis.decodeURIComponent;
declare const encodeURI: typeof globalThis.encodeURI;
declare const decodeURI: typeof globalThis.decodeURI;
`;
