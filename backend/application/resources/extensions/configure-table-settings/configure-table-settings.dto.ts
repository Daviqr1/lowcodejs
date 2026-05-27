import type { IExtension } from '@application/core/entity.core';

export type ConfigureTableSettingsInput = {
  _id: string;
  tableId: string;
  settings: Record<string, unknown>;
  expectedUpdatedAt: Date;
};

export type ConfigureTableSettingsOutput = IExtension;
