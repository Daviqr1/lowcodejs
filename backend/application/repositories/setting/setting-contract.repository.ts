import type { ISetting, Merge } from '@application/core/entity.core';

export type SettingUpdatePayload = Partial<
  Merge<Omit<ISetting, 'MODEL_CLONE_TABLES'>, { MODEL_CLONE_TABLES?: string[] }>
>;

export abstract class SettingContractRepository {
  abstract get(): Promise<ISetting | null>;
  abstract update(payload: SettingUpdatePayload): Promise<ISetting>;
}
