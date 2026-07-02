import { Service } from 'fastify-decorators';

import type { IField } from '@application/core/entity.core';
import {
  hashPasswordFields,
  maskPasswordFields,
  stripMaskedPasswordFields,
} from '@application/core/row-password-helper.core';

import { RowPasswordContractService } from './row-password-contract.service';

@Service()
export default class BcryptRowPasswordService implements RowPasswordContractService {
  async hash(
    payload: Record<string, unknown>,
    fields: IField[],
  ): Promise<void> {
    await hashPasswordFields(payload, fields);
  }

  mask(row: Record<string, unknown>, fields: IField[]): void {
    maskPasswordFields(row, fields);
  }

  stripMasked(payload: Record<string, unknown>, fields: IField[]): void {
    stripMaskedPasswordFields(payload, fields);
  }
}
