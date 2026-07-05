import type { Either } from '@application/core/either.core';
import type { Merge } from '@application/core/entity.core';
import type HTTPException from '@application/core/exception.core';

import type { ImportTablePayload } from './import-table.validator';

export type ImportTableUseCasePayload = Merge<
  ImportTablePayload,
  {
    ownerId: string;
  }
>;

export type ImportedTableSummary = {
  tableId: string;
  slug: string;
  name: string;
};

export type ImportTableResult = {
  /** First imported table id (compat with v1 single-table consumers). */
  tableId: string;
  /** First imported table slug (compat). */
  slug: string;
  importedFields: number;
  importedRows: number;
  /** Detailed list of every imported table. */
  tables: ImportedTableSummary[];
  importedMenus: number;
};

export type ImportTableResponse = Either<HTTPException, ImportTableResult>;
