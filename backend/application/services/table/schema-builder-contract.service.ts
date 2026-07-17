import type {
  IField,
  IGroupConfiguration,
  ITableSchema,
} from '@application/core/entity.core';

export abstract class SchemaBuilderContractService {
  abstract build(
    fields: IField[],
    groups?: IGroupConfiguration[],
  ): ITableSchema;
}
