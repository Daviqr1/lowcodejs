import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  type IField,
  type IGroupConfiguration,
} from './entity.core';
import {
  CNPJ_REGEX,
  CPF_REGEX,
  DECIMAL_REGEX,
  EMAIL_REGEX,
  INTEGER_REGEX,
  PHONE_REGEX,
  URL_REGEX,
} from './field-rules.core';

type FieldFormat = (typeof E_FIELD_FORMAT)[keyof typeof E_FIELD_FORMAT];

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

// Validacao por `format` (legado, sincrona, roda em todos os caminhos de escrita
// de row). Os regexes vivem em `field-rules.core.ts` — a mesma fonte usada pela
// camada nova de regras (`core/validations/*`). As novas validacoes configuraveis
// (is-unique, not-empty, ranges, etc.) rodam no FieldValidationService (async).
const FORMAT_VALIDATORS: Record<string, { regex: RegExp; message: string }> = {
  [E_FIELD_FORMAT.EMAIL]: {
    regex: EMAIL_REGEX,
    message: 'Formato de e-mail inválido',
  },
  [E_FIELD_FORMAT.URL]: {
    regex: URL_REGEX,
    message: 'Formato de URL inválido',
  },
  [E_FIELD_FORMAT.INTEGER]: {
    regex: INTEGER_REGEX,
    message: 'Deve ser um número inteiro',
  },
  [E_FIELD_FORMAT.DECIMAL]: {
    regex: DECIMAL_REGEX,
    message: 'Deve ser um número decimal',
  },
  [E_FIELD_FORMAT.PHONE]: {
    regex: PHONE_REGEX,
    message:
      'Formato de telefone inválido. Use (XX) XXXXX-XXXX ou (XX) XXXX-XXXX',
  },
  [E_FIELD_FORMAT.CNPJ]: {
    regex: CNPJ_REGEX,
    message: 'Formato de CNPJ inválido. Use XX.XXX.XXX/XXXX-XX',
  },
  [E_FIELD_FORMAT.CPF]: {
    regex: CPF_REGEX,
    message: 'Formato de CPF inválido. Use XXX.XXX.XXX-XX',
  },
};

type ValidateRowPayloadOptions = {
  skipMissing?: boolean;
};

export class RowPayloadValidator {
  private static isValidObjectId(value: unknown): boolean {
    return typeof value === 'string' && OBJECT_ID_REGEX.test(value);
  }

  private static isValidISODate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private static validateFormat(
    value: string,
    format: FieldFormat | null,
  ): string | null {
    if (!format || !FORMAT_VALIDATORS[format]) return null;

    const validator = FORMAT_VALIDATORS[format];
    if (!validator.regex.test(value)) {
      return validator.message;
    }
    return null;
  }

  private static validateFieldValue(
    value: unknown,
    field: IField,
    groups?: IGroupConfiguration[],
  ): string | null {
    const { type } = field;
    const isRequired = field.required ?? false;

    // Check required
    if (value === null || value === undefined || value === '') {
      if (isRequired) {
        return 'Este campo é obrigatório';
      }
      return null;
    }

    switch (type) {
      case E_FIELD_TYPE.TEXT_SHORT: {
        if (typeof value !== 'string') return 'Deve ser um texto';

        const formatError = RowPayloadValidator.validateFormat(
          value,
          field.format ?? null,
        );
        if (formatError) return formatError;
        return null;
      }

      case E_FIELD_TYPE.TEXT_LONG: {
        if (typeof value !== 'string') return 'Deve ser um texto';
        return null;
      }

      case E_FIELD_TYPE.DATE: {
        if (!RowPayloadValidator.isValidISODate(value))
          return 'Deve ser uma data válida no formato ISO 8601';

        return null;
      }

      case E_FIELD_TYPE.DROPDOWN: {
        if (!Array.isArray(value)) return 'Deve ser uma lista';

        for (const item of value) {
          if (typeof item !== 'string')
            return 'Todos os itens devem ser textos';
        }
        return null;
      }

      case E_FIELD_TYPE.FILE:
      case E_FIELD_TYPE.RELATIONSHIP:
      case E_FIELD_TYPE.USER:
      case E_FIELD_TYPE.USER_GROUP: {
        if (!Array.isArray(value)) {
          return 'Deve ser uma lista';
        }
        for (const item of value) {
          if (!RowPayloadValidator.isValidObjectId(item)) {
            return 'Todos os itens devem ser IDs válidos';
          }
        }
        return null;
      }

      case E_FIELD_TYPE.CATEGORY: {
        if (!Array.isArray(value)) {
          return 'Deve ser uma lista';
        }
        for (const item of value) {
          if (typeof item !== 'string') {
            return 'Todos os itens devem ser textos';
          }
        }
        return null;
      }

      case E_FIELD_TYPE.FIELD_GROUP: {
        if (!Array.isArray(value)) {
          return 'Deve ser uma lista de objetos';
        }

        // Find the group configuration
        const groupConfig = groups?.find((g) => g.slug === field.group?.slug);
        if (!groupConfig) {
          return null; // No group config, skip validation
        }

        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item !== 'object' || item === null) {
            return `Item no índice ${i} deve ser um objeto`;
          }
          const record: Record<string, unknown> = { ...item };

          // Validate each field in the group
          for (const groupField of groupConfig.fields) {
            if (groupField.native) continue; // Skip native fields
            if (groupField.trashed) continue; // Skip trashed fields
            const fieldValue = record[groupField.slug];
            const fieldError = RowPayloadValidator.validateFieldValue(
              fieldValue,
              groupField,
              groups,
            );
            if (fieldError) {
              return `Item ${i}: ${groupField.name} - ${fieldError}`;
            }
          }
        }
        return null;
      }

      case E_FIELD_TYPE.REACTION:
      case E_FIELD_TYPE.EVALUATION:
      case E_FIELD_TYPE.HTML_CONTENT:
        return null;

      default:
        return null;
    }
  }

  static validate(
    payload: Record<string, unknown>,
    fields: IField[],
    groups?: IGroupConfiguration[],
    options: ValidateRowPayloadOptions = {},
  ): Record<string, string> | null {
    const errors: Record<string, string> = {};

    for (const field of fields) {
      // Skip system-managed fields. RELATIONSHIP não faz parte do payload do row:
      // os vínculos são geridos via links (RelationshipBuilder.extract/persist),
      // criados após o row existir; o required do lado é barrado no frontend.
      if (
        field.type === E_FIELD_TYPE.REACTION ||
        field.type === E_FIELD_TYPE.EVALUATION ||
        field.type === E_FIELD_TYPE.RELATIONSHIP ||
        field.type === E_FIELD_TYPE.HTML_CONTENT
      ) {
        continue;
      }

      if (field.native) continue;

      if (options.skipMissing && !(field.slug in payload)) {
        continue;
      }

      const value = payload[field.slug];
      const error = RowPayloadValidator.validateFieldValue(
        value,
        field,
        groups,
      );

      if (error) {
        errors[field.slug] = error;
      }
    }

    if (Object.keys(errors).length > 0) return errors;
    return null;
  }
}
