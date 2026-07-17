export type ConditionalFieldAction = 'show' | 'hide';

export type ConditionalFieldRule = {
  id: string;
  label?: string;
  sourceFieldId: string;
  sourceFieldSlug: string;
  sourceValue: string;
  showFieldIds: string[];
  hideFieldIds: string[];
};

export type ConditionalFieldsConfig = {
  _id?: string;
  tableId: string;
  tableSlug: string;
  rules: ConditionalFieldRule[];
  createdAt?: Date;
  updatedAt?: Date;
};
