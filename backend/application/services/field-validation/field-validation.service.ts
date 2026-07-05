import { Service } from 'fastify-decorators';

import { E_FIELD_TYPE } from '@application/core/entity.core';
import { getValidationRule } from '@application/core/validations/registry';
import type { ValidationDeps } from '@application/core/validations/rule.contract';
import { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import type { RowTableContext } from '@application/repositories/row/row-contract.repository';
import { UserContractRepository } from '@application/repositories/user/user-contract.repository';

import type { FieldValidationOptions } from './field-validation-contract.service';
import { FieldValidationContractService } from './field-validation-contract.service';

@Service()
export default class FieldValidationService implements FieldValidationContractService {
  constructor(
    private readonly rowRepository: RowContractRepository,
    private readonly userRepository: UserContractRepository,
  ) {}

  // Monta as dependencias de banco com a tabela atual capturada no closure.
  private buildDeps(table: RowTableContext): ValidationDeps {
    return {
      countFieldValue: (fieldSlug, value, excludeRowId): Promise<number> =>
        this.rowRepository.countFieldValue(
          table,
          fieldSlug,
          value,
          excludeRowId,
        ),
      userExistsByEmail: async (email): Promise<boolean> => {
        const user = await this.userRepository.findByEmail(email);
        return Boolean(user);
      },
      userExistsByIdOrEmail: async (idOrEmail): Promise<boolean> => {
        try {
          const byId = await this.userRepository.findById(idOrEmail);
          if (byId) return true;
        } catch {
          // id nao-castavel para ObjectId (ex.: veio um e-mail) — cai no e-mail.
        }
        const byEmail = await this.userRepository.findByEmail(idOrEmail);
        return Boolean(byEmail);
      },
    };
  }

  async validate(
    payload: Record<string, unknown>,
    table: RowTableContext,
    options: FieldValidationOptions = {},
  ): Promise<Record<string, string> | null> {
    const currentRowId = options.currentRowId ?? null;
    const deps = this.buildDeps(table);
    const errors: Record<string, string> = {};

    for (const field of table.fields ?? []) {
      if (field.native) continue;
      if (field.type === E_FIELD_TYPE.HTML_CONTENT) continue;
      if (!field.validations || field.validations.length === 0) continue;
      if (options.skipMissing && !(field.slug in payload)) continue;

      const value = payload[field.slug];

      for (const configured of field.validations) {
        const rule = getValidationRule(configured.rule);
        if (!rule) continue;

        const error = await rule.validate(value, configured.config ?? {}, {
          field,
          payload,
          currentRowId,
          deps,
        });

        // Primeira regra que falha define o erro do campo (uma msg por campo).
        if (error) {
          errors[field.slug] = error;
          break;
        }
      }
    }

    if (Object.keys(errors).length > 0) return errors;
    return null;
  }
}
