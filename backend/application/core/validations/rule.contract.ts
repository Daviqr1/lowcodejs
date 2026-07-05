import type { E_FIELD_VALIDATION, IField, ValueOf } from '../entity.core';

// Campo minimo que uma regra inspeciona para decidir elegibilidade. Usado tanto
// no back (ignorar regra inaplicavel) quanto espelhado no front (filtrar opcoes).
export type ValidationFieldShape = Pick<IField, 'type' | 'format' | 'multiple'>;

// Dependencias de banco que as regras async consomem. O FieldValidationService
// as monta por chamada, com a tabela atual capturada no closure — assim o core
// permanece agnostico de repositorios/Mongoose.
export type ValidationDeps = {
  // Conta rows da tabela atual onde `fieldSlug === value`, ignorando
  // `excludeRowId` (a propria row no update). Usada por IS_UNIQUE.
  countFieldValue(
    fieldSlug: string,
    value: unknown,
    excludeRowId: string | null,
  ): Promise<number>;
  // True se existe um usuario com este e-mail. Usada por EMAIL_EXISTS.
  userExistsByEmail(email: string): Promise<boolean>;
  // True se existe um usuario com este _id ou e-mail. Usada por USER_EXISTS.
  userExistsByIdOrEmail(idOrEmail: string): Promise<boolean>;
};

export type ValidationContext = {
  field: IField;
  payload: Record<string, unknown>;
  // _id da row em edicao (update); null na criacao.
  currentRowId: string | null;
  deps: ValidationDeps;
};

// Contrato de uma regra de validacao de campo. Toda regra vive em
// `core/validations/<regra>/index.ts`. `validate` retorna mensagem de erro
// (PT-BR) ou null quando o valor passa. Assinatura unica async: regras puras
// simplesmente nao awaitam nada.
export abstract class FieldValidationRule {
  abstract readonly key: ValueOf<typeof E_FIELD_VALIDATION>;
  abstract readonly label: string;
  abstract readonly requiresConfig: boolean;

  abstract appliesTo(field: ValidationFieldShape): boolean;

  abstract validate(
    value: unknown,
    config: Record<string, unknown>,
    context: ValidationContext,
  ): Promise<string | null>;
}

// Valor "vazio" — regras puras (exceto NOT_EMPTY) ignoram para nao duplicar a
// checagem de obrigatoriedade (a cargo de `required` / NOT_EMPTY).
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}
