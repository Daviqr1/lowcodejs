import type { ComponentType } from 'react';

import { DateWindowSettingsForm } from './date-window-settings-form';

export interface SettingsFormProps {
  extensionId: string;
  tableId: string;
  initialSettings: Record<string, unknown>;
  expectedUpdatedAt: string;
  onSuccess?: () => void;
}

export const SETTINGS_FORMS: Record<
  string,
  ComponentType<SettingsFormProps>
> = {
  'core:date-window-guard': DateWindowSettingsForm,
  // core:creator-bypass and core:visibility-by-role have no configurable settings
};

export function hasSettingsForm(pluginKey: string): boolean {
  return pluginKey in SETTINGS_FORMS;
}
