import type { RowTableContext } from '@application/repositories/row/row-contract.repository';

export type FieldValidationOptions = {
  // Update parcial: ignora campos ausentes do payload.
  skipMissing?: boolean;
  // _id da row em edicao (update), para regras de unicidade ignorarem a propria.
  currentRowId?: string | null;
};

// Passe de validacao das regras configuradas em `field.validations[]`. Roda
// depois do RowPayloadValidator (estrutural) no create/update de row. Async
// porque algumas regras (IS_UNIQUE, EMAIL_EXISTS, ...) consultam o banco.
export abstract class FieldValidationContractService {
  abstract validate(
    payload: Record<string, unknown>,
    table: RowTableContext,
    options?: FieldValidationOptions,
  ): Promise<Record<string, string> | null>;
}
