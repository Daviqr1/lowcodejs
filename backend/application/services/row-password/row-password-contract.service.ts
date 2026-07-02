/* eslint-disable no-unused-vars */
import type { IField } from '@application/core/entity.core';

export abstract class RowPasswordContractService {
  abstract hash(
    payload: Record<string, unknown>,
    fields: IField[],
  ): Promise<void>;
  abstract mask(row: Record<string, unknown>, fields: IField[]): void;
  abstract stripMasked(
    payload: Record<string, unknown>,
    fields: IField[],
  ): void;
}
