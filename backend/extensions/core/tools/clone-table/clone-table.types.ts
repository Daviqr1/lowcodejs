import type { Either } from '@application/core/either.core';
import type { ITable, Merge } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';
import type { FieldContractRepository } from '@application/repositories/field/field-contract.repository';
import type { RowContractRepository } from '@application/repositories/row/row-contract.repository';
import type { TableContractRepository } from '@application/repositories/table/table-contract.repository';
import type { SchemaBuilderContractService } from '@application/services/table/schema-builder-contract.service';

import type { CloneTablePayload } from './clone-table.validator';

export type CloneTableUseCasePayload = Merge<
  Omit<CloneTablePayload, 'copyDataTableIds'>,
  {
    ownerId: string;
    copyDataTableIds?: string[];
  }
>;

export type CloneTableResponse = Either<
  HTTPException,
  {
    table: ITable;
    tables?: ITable[];
    fieldIdMap: Record<string, string>;
    fieldIdMaps?: Record<string, Record<string, string>>;
  }
>;

export type CloneTableDeps = {
  tableRepository: TableContractRepository;
  fieldRepository: FieldContractRepository;
  rowRepository: RowContractRepository;
  schemaBuilder: SchemaBuilderContractService;
};
