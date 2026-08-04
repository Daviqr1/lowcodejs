import { Service } from 'fastify-decorators';

import {
  E_FIELD_FORMAT,
  E_FIELD_TYPE,
  type IField,
} from '@application/core/entity.core';
import { PasswordContractService } from '@application/services/password/password-contract.service';

import { RowPasswordContractService } from './row-password-contract.service';

// Mascara devolvida na leitura e aceita de volta na escrita como "nao mudou".
const MASK = '••••••••';

@Service()
export default class BcryptRowPasswordService implements RowPasswordContractService {
  constructor(private readonly password: PasswordContractService) {}

  async hash(
    payload: Record<string, unknown>,
    fields: IField[],
  ): Promise<void> {
    for (const field of this.passwordFields(fields)) {
      const value = payload[field.slug];
      if (typeof value !== 'string' || !value) continue;
      if (value === MASK) continue;
      if (this.password.isHashed(value)) continue;

      payload[field.slug] = await this.password.hash(value);
    }
  }

  mask(row: Record<string, unknown>, fields: IField[]): void {
    for (const field of this.passwordFields(fields)) {
      if (row[field.slug]) row[field.slug] = MASK;
    }
  }

  stripMasked(payload: Record<string, unknown>, fields: IField[]): void {
    for (const field of this.passwordFields(fields)) {
      const value = payload[field.slug];
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        value === MASK
      ) {
        delete payload[field.slug];
      }
    }
  }

  private passwordFields(fields: IField[]): IField[] {
    return fields.filter(
      (field) =>
        field.type === E_FIELD_TYPE.TEXT_SHORT &&
        field.format === E_FIELD_FORMAT.PASSWORD,
    );
  }
}
