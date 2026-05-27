import type { IExtension } from '@application/core/entity.core';

export type BulkConfigureTableSettingsInput = {
  _id: string;
  tableIds: string[];
  settings: Record<string, unknown>;
  expectedUpdatedAt: Date;
};

export type BulkConfigureTableSettingsFailure = {
  tableId: string;
  reason: string;
  message: string;
};

export type BulkConfigureTableSettingsOutput = {
  extension: IExtension;
  success: string[];
  failed: BulkConfigureTableSettingsFailure[];
};
