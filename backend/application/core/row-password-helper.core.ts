import bcrypt from 'bcryptjs';

import { E_FIELD_FORMAT, E_FIELD_TYPE, type IField } from './entity.core';

export async function hashPasswordFields(
  payload: Record<string, unknown>,
  fields: IField[],
): Promise<void> {
  const passwordFields = fields.filter(
    (f) =>
      f.type === E_FIELD_TYPE.TEXT_SHORT &&
      f.format === E_FIELD_FORMAT.PASSWORD,
  );
  for (const pf of passwordFields) {
    const val = payload[pf.slug];
    if (
      val &&
      typeof val === 'string' &&
      val !== '••••••••' &&
      !val.startsWith('$2a$') &&
      !val.startsWith('$2b$')
    ) {
      payload[pf.slug] = await bcrypt.hash(val, 12);
    }
  }
}

export function stripMaskedPasswordFields(
  payload: Record<string, unknown>,
  fields: IField[],
): void {
  const passwordFields = fields.filter(
    (f) =>
      f.type === E_FIELD_TYPE.TEXT_SHORT &&
      f.format === E_FIELD_FORMAT.PASSWORD,
  );
  for (const pf of passwordFields) {
    const val = payload[pf.slug];
    if (val === undefined || val === null || val === '' || val === '••••••••') {
      delete payload[pf.slug];
    }
  }
}

export function maskPasswordFields(
  row: Record<string, unknown>,
  fields: IField[],
): void {
  const passwordFields = fields.filter(
    (f) =>
      f.type === E_FIELD_TYPE.TEXT_SHORT &&
      f.format === E_FIELD_FORMAT.PASSWORD,
  );
  for (const pf of passwordFields) {
    if (row[pf.slug]) {
      row[pf.slug] = '••••••••';
    }
  }
}
