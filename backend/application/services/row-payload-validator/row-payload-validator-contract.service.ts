import type {
  IField,
  IGroupConfiguration,
} from '@application/core/entity.core';

export type RowPayloadValidateOptions = {
  /** Update parcial: ignora campos ausentes do payload. */
  skipMissing?: boolean;
};

/**
 * Validacao estrutural do payload de row: tipo e `format` de cada campo.
 * Sincrona e sem banco — roda em todos os caminhos de escrita, antes do
 * `FieldValidationContractService`, que aplica as regras configuraveis em
 * `field.validations[]` e consulta o banco.
 */
export abstract class RowPayloadValidatorContractService {
  /** Mapa slug para mensagem em PT-BR, ou `null` quando o payload passa. */
  abstract validate(
    payload: Record<string, unknown>,
    fields: IField[],
    groups?: IGroupConfiguration[],
    options?: RowPayloadValidateOptions,
  ): Record<string, string> | null;
}
