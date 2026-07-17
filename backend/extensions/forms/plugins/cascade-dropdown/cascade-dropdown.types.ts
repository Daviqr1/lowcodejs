import type { IField, IRow, Merge } from '@application/core/entity.core';

export type CascadeDropdownFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'date_between';

export type CascadeDropdownFilter = {
  id: string;
  fieldId: string;
  fieldSlug: string;
  fieldType: string;
  operator: CascadeDropdownFilterOperator;
  value: string | null;
  values: string[];
  dateStart: string | null;
  dateEnd: string | null;
};

export type CascadeDropdownConfig = {
  _id?: string;
  targetTableSlug: string;
  targetFieldId: string;
  targetFieldSlug: string;
  sourceTableId: string;
  sourceTableSlug: string;
  parentFieldId: string;
  parentFieldSlug: string;
  childFieldId: string;
  childFieldSlug: string;
  enabled: boolean;
  parentWidth: number;
  childWidth: number;
  filters: CascadeDropdownFilter[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type CascadeDropdownOption = {
  value: string;
  label: string;
};

export type CascadeDropdownChildOption = Merge<
  CascadeDropdownOption,
  { row: IRow }
>;

export type CascadeDropdownFieldLookup = Pick<
  IField,
  '_id' | 'slug' | 'name' | 'type' | 'dropdown' | 'category'
>;
