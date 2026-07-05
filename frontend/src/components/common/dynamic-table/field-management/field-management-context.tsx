import { createContext, use } from 'react';

import type { IField } from '@/lib/interfaces';

export type VisibilityKey =
  | 'showInFilter'
  | 'showInForm'
  | 'showInDetail'
  | 'showInList';

export type WidthKey = 'widthInForm' | 'widthInList' | 'widthInDetail';

export type FieldManagementActions = {
  fields: Array<IField>;
  fieldOrderList: Array<string>;
  fieldOrderForm: Array<string>;
  fieldOrderFilter: Array<string>;
  fieldOrderDetail: Array<string>;
  onToggleVisibility: (
    field: IField,
    visibilityKey: VisibilityKey,
    newValue: boolean,
  ) => void;
  onChangeWidth: (field: IField, widthKey: WidthKey, newWidth: number) => void;
  onSaveOrder: (
    visibilityKey: VisibilityKey,
    orderedFieldIds: Array<string>,
  ) => void;
  onDeleteField: (field: IField) => void;
  onRestoreField: (field: IField) => void;
  onEditField: (fieldId: string) => void;
  togglingFieldId: string | null;
  changingWidthFieldId: string | null;
  deletingFieldId: string | null;
  restoringFieldId: string | null;
  isSavingOrder: boolean;
};

const FieldManagementContext = createContext<FieldManagementActions | null>(
  null,
);

export const FieldManagementProvider = FieldManagementContext.Provider;

export function useFieldManagement(): FieldManagementActions {
  const context = use(FieldManagementContext);
  if (!context) {
    throw new Error(
      'useFieldManagement must be used within FieldManagement.Root',
    );
  }
  return context;
}
