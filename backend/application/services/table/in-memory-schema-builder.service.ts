import type {
  IField,
  IGroupConfiguration,
  ITableSchema,
} from '@application/core/entity.core';

import { SchemaBuilderContractService } from './schema-builder-contract.service';

export default class InMemorySchemaBuilder implements SchemaBuilderContractService {
  private _forcedErrors = new Map<string, Error>();

  simulateError(method: string, error: Error): void {
    this._forcedErrors.set(method, error);
  }

  build(_fields: IField[], _groups?: IGroupConfiguration[]): ITableSchema {
    const err = this._forcedErrors.get('build');
    if (err) {
      this._forcedErrors.delete('build');
      throw err;
    }
    return {};
  }
}
