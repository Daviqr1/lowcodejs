import type {
  E_FIELD_VALIDATION,
  ValueOf,
} from '@application/core/entity.core';

import type { FieldValidationRule } from './field-validation-rule-contract.service';

export type ValidationRuleKey = ValueOf<typeof E_FIELD_VALIDATION>;

/**
 * Catalogo das regras configuraveis em `field.validations[]`. Cada regra vive
 * em `rules/<regra>/index.ts` e exporta uma instancia default.
 */
export abstract class FieldValidationRuleRegistryContractService {
  /** A regra com esta chave, ou `undefined` quando nao ha. */
  abstract get(key: ValidationRuleKey): FieldValidationRule | undefined;

  /** Todas as regras registradas. */
  abstract list(): FieldValidationRule[];
}
